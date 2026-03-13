use anchor_lang::prelude::*;
use arcium_anchor::*;
use arcium_macros::*;

declare_id!("PrivPerps1111111111111111111111111111111111");

// ============================================================================
// Account Structs
// ============================================================================

/// Stores an encrypted perpetual position on-chain.
/// The encrypted state contains side, size, entry_price, and leverage —
/// none of which are ever exposed publicly.
#[account]
#[derive(InitSpace)]
pub struct PositionAccount {
    pub bump: u8,
    /// Owner of the position
    pub owner: Pubkey,
    /// Unique position ID (monotonic counter)
    pub position_id: u64,
    /// Unix timestamp when position was opened
    pub opened_at: i64,
    /// Whether the position is currently open
    pub is_open: bool,
    /// Asset identifier: 0=SOL, 1=BTC, 2=ETH
    pub asset: u8,
    /// Side: 0=long, 1=short (plaintext for UI display only)
    pub side: u8,
    /// Nonce for the encrypted state
    pub state_nonce: u128,
    /// Encrypted position state — 4 ciphertexts:
    ///   [0] side (u8), [1] size_usd (u64), [2] entry_price (u64), [3] leverage (u8)
    pub encrypted_state: [[u8; 32]; 4],
}

/// Global protocol state.
#[account]
#[derive(InitSpace)]
pub struct GlobalState {
    pub bump: u8,
    /// Authority that initialized the protocol
    pub authority: Pubkey,
    /// Total number of positions ever opened (used as ID counter)
    pub position_count: u64,
    /// Total closed volume in USD (plaintext accumulator)
    pub total_volume_usd: u64,
    /// Fee vault address for collecting protocol fees
    pub fee_vault: Pubkey,
}

// ============================================================================
// Events
// ============================================================================

#[event]
pub struct PositionOpenedEvent {
    pub position_id: u64,
    pub owner: Pubkey,
    pub asset: u8,
    pub side: u8,
    pub timestamp: i64,
}

#[event]
pub struct LiquidationCheckEvent {
    pub position_id: u64,
    pub owner: Pubkey,
    /// Encrypted result — client must decrypt
    pub result_ciphertexts: [[u8; 32]; 1],
    pub result_nonce: u128,
}

#[event]
pub struct PnlRevealEvent {
    pub position_id: u64,
    pub owner: Pubkey,
    /// Encrypted PnL result — client must decrypt
    /// [0] = realized_pnl (u64), [1] = is_profit (u8)
    pub pnl_ciphertexts: [[u8; 32]; 2],
    pub pnl_nonce: u128,
}

#[event]
pub struct PositionClosedEvent {
    pub position_id: u64,
    pub owner: Pubkey,
    pub closed_at: i64,
}

// ============================================================================
// Errors
// ============================================================================

#[error_code]
pub enum ErrorCode {
    #[msg("Computation was aborted by the MPC cluster")]
    AbortedComputation,
    #[msg("Position is not open")]
    PositionNotOpen,
    #[msg("Position is already closed")]
    PositionAlreadyClosed,
    #[msg("Unauthorized — only the position owner can perform this action")]
    Unauthorized,
    #[msg("Invalid asset type")]
    InvalidAsset,
    #[msg("Invalid side — must be 0 (long) or 1 (short)")]
    InvalidSide,
    #[msg("Invalid leverage — must be 1 to 100")]
    InvalidLeverage,
    #[msg("Cluster is not configured")]
    ClusterNotSet,
}

// ============================================================================
// Program
// ============================================================================

#[arcium_program]
pub mod private_perps {
    use super::*;

    // ========================================================================
    // Protocol Initialization
    // ========================================================================

    /// Initializes global protocol state. Called once after deployment.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.global_state;
        state.bump = ctx.bumps.global_state;
        state.authority = ctx.accounts.authority.key();
        state.position_count = 0;
        state.total_volume_usd = 0;
        state.fee_vault = ctx.accounts.authority.key();
        Ok(())
    }

    // ========================================================================
    // Computation Definition Initialization (call once per circuit after deploy)
    // ========================================================================

    pub fn init_open_position_comp_def(
        ctx: Context<InitOpenPositionCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_check_liquidation_comp_def(
        ctx: Context<InitCheckLiquidationCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    pub fn init_close_position_comp_def(
        ctx: Context<InitClosePositionCompDef>,
    ) -> Result<()> {
        init_comp_def(ctx.accounts, None, None)?;
        Ok(())
    }

    // ========================================================================
    // Open Position — queues MPC computation
    // ========================================================================

    pub fn open_position(
        ctx: Context<OpenPosition>,
        computation_offset: u64,
        asset: u8,
        side: u8,
        encrypted_side: [u8; 32],
        encrypted_size_usd: [u8; 32],
        encrypted_entry_price: [u8; 32],
        encrypted_leverage: [u8; 32],
        client_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        require!(asset <= 2, ErrorCode::InvalidAsset);
        require!(side <= 1, ErrorCode::InvalidSide);

        // Increment position counter
        let global = &mut ctx.accounts.global_state;
        let position_id = global.position_count;
        global.position_count = global.position_count.checked_add(1).unwrap();

        // Initialize position account
        let position = &mut ctx.accounts.position;
        position.bump = ctx.bumps.position;
        position.owner = ctx.accounts.trader.key();
        position.position_id = position_id;
        position.opened_at = Clock::get()?.unix_timestamp;
        position.is_open = true;
        position.asset = asset;
        position.side = side;
        position.state_nonce = 0;
        position.encrypted_state = [[0u8; 32]; 4];

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Build arguments: client encrypted inputs
        let args = ArgBuilder::new()
            .x25519_pubkey(client_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u8(encrypted_side)
            .encrypted_u64(encrypted_size_usd)
            .encrypted_u64(encrypted_entry_price)
            .encrypted_u8(encrypted_leverage)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![OpenPositionCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.position.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "open_position")]
    pub fn open_position_callback(
        ctx: Context<OpenPositionCallback>,
        output: SignedComputationOutputs<OpenPositionOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(OpenPositionOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let position_id = ctx.accounts.position.position_id;
        let owner = ctx.accounts.position.owner;
        let asset = ctx.accounts.position.asset;
        let side = ctx.accounts.position.side;
        let timestamp = ctx.accounts.position.opened_at;

        let position = &mut ctx.accounts.position;
        position.encrypted_state = o.ciphertexts;
        position.state_nonce = o.nonce;

        emit!(PositionOpenedEvent {
            position_id,
            owner,
            asset,
            side,
            timestamp,
        });

        Ok(())
    }

    // ========================================================================
    // Check Liquidation — queues MPC computation
    // ========================================================================

    pub fn check_liquidation(
        ctx: Context<CheckLiquidation>,
        computation_offset: u64,
        encrypted_current_price: [u8; 32],
        client_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        require!(ctx.accounts.position.is_open, ErrorCode::PositionNotOpen);

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        // Account offset for encrypted_state:
        // discriminator(8) + bump(1) + owner(32) + position_id(8) + opened_at(8)
        // + is_open(1) + asset(1) + side(1) + state_nonce(16) = 76
        const ENCRYPTED_STATE_OFFSET: u32 = 76;
        const ENCRYPTED_STATE_SIZE: u32 = 32 * 4;

        let args = ArgBuilder::new()
            .plaintext_u128(ctx.accounts.position.state_nonce)
            .account(
                ctx.accounts.position.key(),
                ENCRYPTED_STATE_OFFSET,
                ENCRYPTED_STATE_SIZE,
            )
            .x25519_pubkey(client_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(encrypted_current_price)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![CheckLiquidationCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.position.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "check_liquidation")]
    pub fn check_liquidation_callback(
        ctx: Context<CheckLiquidationCallback>,
        output: SignedComputationOutputs<CheckLiquidationOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(CheckLiquidationOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let position_id = ctx.accounts.position.position_id;
        let owner = ctx.accounts.position.owner;

        emit!(LiquidationCheckEvent {
            position_id,
            owner,
            result_ciphertexts: o.ciphertexts,
            result_nonce: o.nonce,
        });

        Ok(())
    }

    // ========================================================================
    // Close Position — queues MPC computation
    // ========================================================================

    pub fn close_position(
        ctx: Context<ClosePosition>,
        computation_offset: u64,
        encrypted_exit_price: [u8; 32],
        client_pubkey: [u8; 32],
        nonce: u128,
    ) -> Result<()> {
        require!(ctx.accounts.position.is_open, ErrorCode::PositionNotOpen);
        require!(
            ctx.accounts.position.owner == ctx.accounts.trader.key(),
            ErrorCode::Unauthorized
        );

        ctx.accounts.sign_pda_account.bump = ctx.bumps.sign_pda_account;

        const ENCRYPTED_STATE_OFFSET: u32 = 76;
        const ENCRYPTED_STATE_SIZE: u32 = 32 * 4;

        let args = ArgBuilder::new()
            .plaintext_u128(ctx.accounts.position.state_nonce)
            .account(
                ctx.accounts.position.key(),
                ENCRYPTED_STATE_OFFSET,
                ENCRYPTED_STATE_SIZE,
            )
            .x25519_pubkey(client_pubkey)
            .plaintext_u128(nonce)
            .encrypted_u64(encrypted_exit_price)
            .build();

        queue_computation(
            ctx.accounts,
            computation_offset,
            args,
            vec![ClosePositionCallback::callback_ix(
                computation_offset,
                &ctx.accounts.mxe_account,
                &[CallbackAccount {
                    pubkey: ctx.accounts.position.key(),
                    is_writable: true,
                }],
            )?],
            1,
            0,
        )?;

        Ok(())
    }

    #[arcium_callback(encrypted_ix = "close_position")]
    pub fn close_position_callback(
        ctx: Context<ClosePositionCallback>,
        output: SignedComputationOutputs<ClosePositionOutput>,
    ) -> Result<()> {
        let o = match output.verify_output(
            &ctx.accounts.cluster_account,
            &ctx.accounts.computation_account,
        ) {
            Ok(ClosePositionOutput { field_0 }) => field_0,
            Err(_) => return Err(ErrorCode::AbortedComputation.into()),
        };

        let position_id = ctx.accounts.position.position_id;
        let owner = ctx.accounts.position.owner;
        let closed_at = Clock::get()?.unix_timestamp;

        // Mark position as closed
        ctx.accounts.position.is_open = false;

        emit!(PnlRevealEvent {
            position_id,
            owner,
            pnl_ciphertexts: o.ciphertexts,
            pnl_nonce: o.nonce,
        });

        emit!(PositionClosedEvent {
            position_id,
            owner,
            closed_at,
        });

        Ok(())
    }
}

// ============================================================================
// Context Structs — Initialize
// ============================================================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + GlobalState::INIT_SPACE,
        seeds = [b"global_state"],
        bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// Context Structs — Comp Def Initialization (generated by arcium_macros)
// ============================================================================

// The #[arcium_program] macro automatically generates:
// - InitOpenPositionCompDef
// - InitCheckLiquidationCompDef
// - InitClosePositionCompDef
// These derive from the encrypted-ixs circuit names.

// ============================================================================
// Context Structs — Open Position
// ============================================================================

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct OpenPosition<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init,
        payer = trader,
        space = 8 + PositionAccount::INIT_SPACE,
        seeds = [
            b"position",
            trader.key().as_ref(),
            global_state.position_count.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub position: Account<'info, PositionAccount>,
    #[account(
        init_if_needed,
        space = 9,
        payer = trader,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_OPEN_POSITION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct OpenPositionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_OPEN_POSITION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub position: Account<'info, PositionAccount>,
}

// ============================================================================
// Context Structs — Check Liquidation
// ============================================================================

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct CheckLiquidation<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(
        mut,
        constraint = position.is_open @ ErrorCode::PositionNotOpen,
    )]
    pub position: Account<'info, PositionAccount>,
    #[account(
        init_if_needed,
        space = 9,
        payer = trader,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_LIQUIDATION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct CheckLiquidationCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CHECK_LIQUIDATION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub position: Account<'info, PositionAccount>,
}

// ============================================================================
// Context Structs — Close Position
// ============================================================================

#[derive(Accounts)]
#[instruction(computation_offset: u64)]
pub struct ClosePosition<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(
        mut,
        constraint = position.is_open @ ErrorCode::PositionNotOpen,
        constraint = position.owner == trader.key() @ ErrorCode::Unauthorized,
    )]
    pub position: Account<'info, PositionAccount>,
    #[account(
        init_if_needed,
        space = 9,
        payer = trader,
        seeds = [&SIGN_PDA_SEED],
        bump,
        address = derive_sign_pda!(),
    )]
    pub sign_pda_account: Account<'info, ArciumSignerAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    #[account(mut, address = derive_mempool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: mempool_account, checked by the arcium program.
    pub mempool_account: UncheckedAccount<'info>,
    #[account(mut, address = derive_execpool_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: executing_pool, checked by the arcium program.
    pub executing_pool: UncheckedAccount<'info>,
    #[account(mut, address = derive_comp_pda!(computation_offset, mxe_account, ErrorCode::ClusterNotSet))]
    /// CHECK: computation_account, checked by the arcium program.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLOSE_POSITION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(mut, address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(mut, address = ARCIUM_FEE_POOL_ACCOUNT_ADDRESS)]
    pub pool_account: Account<'info, FeePool>,
    #[account(mut, address = ARCIUM_CLOCK_ACCOUNT_ADDRESS)]
    pub clock_account: Account<'info, ClockAccount>,
    pub system_program: Program<'info, System>,
    pub arcium_program: Program<'info, Arcium>,
}

#[derive(Accounts)]
pub struct ClosePositionCallback<'info> {
    pub arcium_program: Program<'info, Arcium>,
    #[account(address = derive_comp_def_pda!(COMP_DEF_OFFSET_CLOSE_POSITION))]
    pub comp_def_account: Account<'info, ComputationDefinitionAccount>,
    #[account(address = derive_mxe_pda!())]
    pub mxe_account: Account<'info, MXEAccount>,
    /// CHECK: computation_account, checked by arcium program via constraints.
    pub computation_account: UncheckedAccount<'info>,
    #[account(address = derive_cluster_pda!(mxe_account, ErrorCode::ClusterNotSet))]
    pub cluster_account: Account<'info, Cluster>,
    #[account(address = ::anchor_lang::solana_program::sysvar::instructions::ID)]
    /// CHECK: instructions_sysvar, checked by the account constraint.
    pub instructions_sysvar: AccountInfo<'info>,
    #[account(mut)]
    pub position: Account<'info, PositionAccount>,
}

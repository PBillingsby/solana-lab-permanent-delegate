import {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  PublicKey,
} from '@solana/web3.js';

import {
  ExtensionType,
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  mintTo,
  createAccount,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  transferChecked,
} from '@solana/spl-token';
import { initializeKeypair } from './keypair-helper';

(async () => {
  const connection = new Connection(clusterApiUrl("devnet"), 'confirmed');
  const payer = await initializeKeypair(connection);

  const mintAuthority = payer;
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  const permanentDelegate = payer;

  const extensions = [ExtensionType.PermanentDelegate];
  const mintLen = getMintLen(extensions);
  const decimals = 9;

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializePermanentDelegateInstruction(mint, permanentDelegate.publicKey, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint, decimals, mintAuthority.publicKey, null, TOKEN_2022_PROGRAM_ID)
  );

  await sendAndConfirmTransaction(connection, mintTransaction, [payer, mintKeypair], undefined);

  const randomKeypair = new Keypair();
  const sourceTokenAccount = await createAccount(
    connection,
    payer,
    mint,
    randomKeypair.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );
  const destinationTokenAccount = await createAccount(
    connection,
    payer,
    mint,
    payer.publicKey,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  await mintTo(
    connection,
    payer,
    mint,
    sourceTokenAccount,
    mintAuthority,
    200,
    undefined,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  {
    // Shows that you cannot transfer without the correct delegate
    await testTryingToTransferWithoutDelegate({
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      amount: 100,
      decimals,

    });
  }

  {
    // Shows that you can transfer with the correct delegate
    await testTryingToTransferWithDelegate({
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      amount: 100,
      decimals,

    });
  }

  {
    // Shows that you cannot burn without the correct delegate
    await testTryingToBurnWithoutDelegate({
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      amount: 100,
      decimals,

    });
  }

  {
    // Shows that you can burn with the correct delegate
    await testTryingToBurnWithDelegate({
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      amount: 100,
      decimals,

    });
  }

})();

interface TransferWithoutDelegateInputs {
  connection: Connection;
  payer: Keypair;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  destinationTokenAccount: PublicKey;
  amount: number;
  decimals: number;
}

async function testTryingToTransferWithoutDelegate(inputs: TransferWithoutDelegateInputs) {
  const { connection, payer, sourceTokenAccount, mint, destinationTokenAccount, amount, decimals } = inputs;
  try {
    await transferChecked(
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      sourceTokenAccount, // Using source account as delegate
      100,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.error("You should not be able to transfer without delegate.");

  } catch (error) {
    console.log(
      `✅ - We expected this to fail because the transferring account is not the delegate.`
    );
  }
}

interface TransferWithDelegateInputs {
  connection: Connection;
  payer: Keypair;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  destinationTokenAccount: PublicKey;
  amount: number;
  decimals: number;
}

async function testTryingToTransferWithDelegate(inputs: TransferWithDelegateInputs) {
  const { connection, payer, sourceTokenAccount, mint, destinationTokenAccount, amount, decimals } = inputs;
  try {
    await transferChecked(
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      payer, // Using the actual delegate
      100,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.error("✅ - We expected this to pass because the transferring account is the delegate.");
  } catch (error) {
    console.error("You should be able to transfer with the delegate.");

  }
}

interface BurnWithoutDelegateInputs {
  connection: Connection;
  payer: Keypair;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  destinationTokenAccount: PublicKey;
  amount: number;
  decimals: number;
}

async function testTryingToBurnWithoutDelegate(inputs: BurnWithoutDelegateInputs) {
  const { connection, payer, sourceTokenAccount, mint, destinationTokenAccount, amount, decimals } = inputs;
  try {
    await transferChecked(
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      sourceTokenAccount, // Using source account as delegate
      100,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.error("You should not be able to burn without delegate.");

  } catch (error) {
    console.log(
      `✅ - We expected this to fail because the burning account is not the delegate.`
    );
  }
}

interface BurnWithDelegateInputs {
  connection: Connection;
  payer: Keypair;
  sourceTokenAccount: PublicKey;
  mint: PublicKey;
  destinationTokenAccount: PublicKey;
  amount: number;
  decimals: number;
}

async function testTryingToBurnWithDelegate(inputs: BurnWithDelegateInputs) {
  const { connection, payer, sourceTokenAccount, mint, destinationTokenAccount, amount, decimals } = inputs;
  try {
    await transferChecked(
      connection,
      payer,
      sourceTokenAccount,
      mint,
      destinationTokenAccount,
      payer, // Using the actual delegate
      100,
      decimals,
      undefined,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.error("✅ - We expected this to pass because the burning account is the delegate.");

  } catch (error) {
    console.error("You should be able to burn with the correct delegate.");
  }
}
import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"

import idl from "./solanapdas.json"

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address)  // create a new pubkey for programID

export const Bank: FC = () => {
    const ourWallet = useWallet();  // points to user's wallet
    const { connection } = useConnection();  // uses in browser wallet connection

    const [banks, setBanks] = useState([]);

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider
    }

    const createBank = async () => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            // find PDA account according to seeds and programID
            const [bank] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("bankaccount"),
                anchProvider.wallet.publicKey.toBuffer()
            ], program.programId)

            // call the create() function in primary lib.rs
            await program.rpc.create(
                "WsoS Bank", {
                    accounts: {
                        bank,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

            console.log("Wow, new bank was created" + bank.toString())

        } catch (error) {
            console.log("Error while creating the bank " + error)
        }
    }

    // Get the PDA banks
    const getBanks = async () => {        
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            Promise.all(
                (await connection.getProgramAccounts(programID)).map(async bank => (
                        {
                            ...(await program.account.bank.fetch(bank.pubkey)),
                            pubkey: bank.pubkey
                        }
                    )
                )
            ).then(banks => {
                console.log(banks)
                setBanks(banks)
            })
        } catch (error) {
            console.log("Error while getting banks " + error)
        }
    }


    // Deposit func
    const depositBank = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            await program.rpc.deposit(
                new BN(0.1 * web3.LAMPORTS_PER_SOL),
                {
                    accounts: {
                        bank: publicKey,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

        } catch (error) {
            console.log("Error depositing to bank " + error)
        }
    }

    // Withdraw func
    const withdrawBank = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            // Get PDA bank
            const bank = await connection.getAccountInfo(publicKey)
            // Get min balance for rent
            const rentBalance = await connection.getMinimumBalanceForRentExemption(bank.data.length)
            // Get total bank balance
            const balance = bank.data.length

            await program.rpc.withdraw(
                new BN(balance - rentBalance),
                {
                    accounts: {
                        bank: publicKey,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

        } catch (error) {
            console.log("Error withdrawing from bank " + error)
        }
    }


    return (
        <>
            {
                banks.map(
                    (bank) => {
                        return (
                            <div className="md:hero-content flex flex-col">
                                <h1>{bank.name.toString()}</h1>
                                <span>{bank.balance.toString()}</span>
                                <button
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                    onClick={() => depositBank(bank.pubkey)}
                                >
                                    <span>
                                        Deposit 0.1
                                    </span>
                                </button>

                                <button
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                    onClick={() => withdrawBank(bank.pubkey)}
                                >
                                    <span>
                                        Withdraw Bank Funds
                                    </span>
                                </button>
                            </div>
                        )
                    }
                )
            }
            <div className="flex flex-row justify-center">
                <>
                    <div className="relative group items-center">
                        <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                    rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>

                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={createBank}
                        >
                            <span className="block group-disabled:hidden" >
                                Create Bank
                            </span>
                        </button>

                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={getBanks}
                        >
                            <span className="block group-disabled:hidden" >
                                Fetch Banks
                            </span>
                        </button>
                    </div>
                </>
            </div>
        </>
    );
};

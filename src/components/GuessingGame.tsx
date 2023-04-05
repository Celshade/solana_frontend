import { verify } from '@noble/ed25519';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { FC, useCallback, useState } from 'react';
import { notify } from "../utils/notifications";

import { Program, AnchorProvider, web3, utils, BN } from "@project-serum/anchor"
import { PublicKey } from "@solana/web3.js"

import idl from "./gg.json"

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.metadata.address)  // create a new pubkey for programID

export const GuessingGame: FC = () => {
    const ourWallet = useWallet();  // points to user's wallet
    const { connection } = useConnection();  // uses in browser wallet connection

    const [pot, setPot] = useState([]);

    const getProvider = () => {
        const provider = new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())
        return provider
    }


    const createPot = async () => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            // find PDA account according to seeds and programID
            const [pot] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode("jackpot"),
                anchProvider.wallet.publicKey.toBuffer()
            ], program.programId)

            // call the create() function in primary lib.rs
            await program.rpc.create(
                "JackPot", {
                    accounts: {
                        pot,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

            console.log("Wow, new jackpot was created" + pot.toString())

        } catch (error) {
            console.log("Error while creating the jackpot " + error)
        }
    }


    // Get the PDA jackpot
    const getPot = async () => {        
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            Promise.all(
                (await connection.getProgramAccounts(programID)).map(async pot => (
                        {
                            ...(await program.account.pot.fetch(pot.pubkey)),
                            pubkey: pot.pubkey
                        }
                    )
                )
            ).then(pot => {
                console.log(pot)
                setPot(pot)
            })
        } catch (error) {
            console.log("Error while getting JackPot " + error)
        }
    }


    // Guessing func
    const depositPot = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)

            await program.rpc.deposit(
                {
                    accounts: {
                        pot: publicKey,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

        } catch (error) {
            console.log("Error depositing to play " + error)
        }
    }


    // Win/Lose function
    const winOrLose = async (publicKey) => {
        try {
            const anchProvider = getProvider()
            const program = new Program(idl_object, programID, anchProvider)
            const guess = Math.ceil(Math.random() * (100 - 0) + 0)

            // Get PDA pot
            const pot = await connection.getAccountInfo(publicKey)
            // Get total bank balance
            const balance = pot.data.length

            await program.rpc.guess(
                new BN(guess),
                {
                    accounts: {
                        bank: publicKey,
                        user: anchProvider.wallet.publicKey,
                        systemProgram: web3.SystemProgram.programId
                    }
                }
            )

        } catch (error) {
            console.log("Error guessing " + error)
        }
    }


    return (
        <>
            {
                pot.map(
                    (pot) => {
                        return (
                            <div key="yes" className="md:hero-content flex flex-col">
                                <h1>{pot.name.toString()}</h1>
                                <span>{pot.balance.toString()}</span>
                                <button
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                    onClick={() => depositPot(pot.pubkey)}
                                >
                                    <span>
                                        Deposit 0.1 to Play!
                                    </span>
                                </button>

                                <button
                                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                                    onClick={() => winOrLose(pot.pubkey)}
                                >
                                    <span>
                                        Roll the dice and try your luck!
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
                            onClick={createPot}
                        >
                            <span className="block group-disabled:hidden" >
                                Create Game
                            </span>
                        </button>

                        <button
                            className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                            onClick={getPot}
                        >
                            <span className="block group-disabled:hidden" >
                                Fetch Game
                            </span>
                        </button>
                    </div>
                </>
            </div>
        </>
    );
};

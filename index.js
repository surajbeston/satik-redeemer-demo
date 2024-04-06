import express from 'express'; 
import * as anchor from "@coral-xyz/anchor";
import BN from 'bn.js';

import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@project-serum/anchor";

import fs from 'fs';

import { TOKEN_PROGRAM_ID, mintTo } from '@solana/spl-token';

const app = express();
const port = process.env.PORT || 3002;


const idl = JSON.parse(fs.readFileSync('satik.json', 'utf8'));

const seeds = JSON.parse(process.env.SEEDS);
const uintSeeds = Uint8Array.from(seeds)
const wallet =  anchor.web3.Keypair.fromSecretKey(uintSeeds);

const mintAuthoritySeeds = JSON.parse(process.env.SEEDS);
const mintAuthorityUint = Uint8Array.from(mintAuthoritySeeds);

const mintAuthority = anchor.web3.Keypair.fromSecretKey(mintAuthorityUint);

const preflightCommitment = "processed";
const commitment = "confirmed";

const programID = new PublicKey(idl.metadata.address);

const connection = new Connection("https://devnet.helius-rpc.com/?api-key=f34375fa-df6a-425f-8515-e619ad9c9839", commitment);

const provider = new AnchorProvider(connection, new Wallet(wallet), {
                        preflightCommitment,
                        commitment,
                    })

const program =  new Program(idl, programID, provider);

// console.log(program.account)

const purchases = await program.account.purchase.all();

app.get('/', async (req, res) => {
    if (!req.query.purchaseAddress || !req.query.bump) {
        res.send('Please provide purchaseAddress');
        return;
    }
    try{
        const purchaseAddress = new PublicKey(req.query.purchaseAddress);
        const purchase = await program.account.purchase.fetch(purchaseAddress);

        const redeemDatetimeAddress = anchor.web3.Keypair.generate();
        const mint = new PublicKey("8TYBs78yzk662G5oDv84um73Xthy51nu4mkgKNYcZjzy");

        const bump = parseInt(req.query.bump);

        console.log("Escrow Address: ", purchase.escrow.toBase58());



        const tx6 = await program.methods.redeemAmount(bump)
                                        .accounts({
                                            redeemDatetime: redeemDatetimeAddress.publicKey,
                                            purchase: purchaseAddress,
                                            brandReceiver: purchase.brandReceiver,
                                            influencerReceiver: purchase.influencerReceiver,
                                            // satikReceiver: purchase.satikReceiver,
                                            escrow: purchase.escrow,
                                            mint: mint,
                                            tokenProgram: TOKEN_PROGRAM_ID 
                                        })
                                        .signers([redeemDatetimeAddress, wallet])
                                        .rpc({
                                            skipPreflight: true
                                        })

        console.log(tx6)
    }
    catch(error) {
        console.log(error)
        res.status(500).send("Something went horribly wrong")
    }
    res.send('Successful response.');
    return;
})

app.get('/mint', async (req, res) => {
    if (!req.query.address || !req.query.amount) {
        res.status(301).send('Please provide address and amount');
        return;
    }
    const customer_ATA = new PublicKey(req.query.address);
    const amount = req.query.amount;
    const mint = new PublicKey("8TYBs78yzk662G5oDv84um73Xthy51nu4mkgKNYcZjzy");

    const tx5 = await mintTo(
        program.provider.connection,
        mintAuthority,
        mint,
        customer_ATA,
        mintAuthority.publicKey,
        amount
    )
    res.send(req.query);
    return;
})



app.listen(port, () => console.log('Example app is listening on port 3000.'));

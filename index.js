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

const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- https://i.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap"
      rel="stylesheet"
    />
    <title>Purchased</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .wrapper {
        max-width: 1400px;
        margin: 1rem auto;
        text-align: center;
        border: 4px solid #21c179;
        border-radius: 30px;
        padding: 3rem 0;
      }
      .payment_successful {
        font-size: 26px;
        padding: 1rem 0;
        font-family: "Roboto Mono";
      }
      .title {
        font-size: 48px;
        font-weight: 600;
        padding: 1rem;
        font-family: "Roboto Mono";
      }
      .highlight {
        color: #2e47b6;
      }
      .sub_title {
        font-size: 24px;
        padding: 1rem 0;
        font-weight: 500;
        font-family: "Roboto Mono";
      }
      .success_icon {
        fill: #21c179;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        height="79"
        viewBox="0 0 24 24"
        width="79"
        class="success_icon"
      >
        <circle cx="12" cy="12" fill="#21c179" r="10" />
        <path
          clip-rule="evenodd"
          d="m16.6766 8.58327c.1936.19698.1908.51355-.0062.70708l-5.7054 5.60545c-.1914.1881-.4972.1915-.6927.0078l-2.67382-2.5115c-.20128-.189-.21118-.5055-.02212-.7067.18906-.2013.50548-.2112.70676-.0222l2.32368 2.1827 5.3628-5.26888c.1969-.19353.5135-.19073.707.00625z"
          fill="#fff"
          fill-rule="evenodd"
        />
      </svg>
      <h3 class="payment_successful">Payment has been received for $20</h3>
      <h1 class="title">
        Your <span class="highlight">NEBULA</span> subscription was successful!
      </h1>

      <p class="sub_title">Thank you for your purchase.</p>
    </div>
  </body>
</html>
`

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
    res.send(htmlContent);
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

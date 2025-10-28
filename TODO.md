Nice, so this is my project Dust3, we recently changed a lot of stuff and now we're using candy machine on Solana side instead of normal programs. So now we need to work to integrate everything. Read @PRODUCTION_INTEGRATION_GUIDE.md and tell me what we need to do.

So we have a lot of refactoring to do and I'll create a TODO list for you.

[x] Use as only Admin page the Pack Manager tab
    [x] Refactor backend db so we store all the data currently inputted to create a box on candy machine(This would be only to save on database, since we create the candy machine box before using sugar CLI) 
    [x] Properties like price, box name and skins metadata(rarity, name, etc), an ID to match the onchain box should be stored in a box register
    [x] Frontend Admin should support that backend/db integration properly, this is what is gonna be shown on Packs page 
[x] Only this pubkey should be abled to access Admin Page: v1t1nCTfxttsTFW3t7zTQFUsdpznu8kggzYSg7SDJMs
[x] Packs page
    [x] Should be integrated with our new Admin(Pack Manager) inputs when fetching box information and odds of each one
    [x] The Open Pack button should be exactly what have currently on test-mint by clicking "Mint NFT from Candy Machine" but fetching the onchain collection mint, candy machine from db to allow having different boxes
    [x] Remove the roulette, show only the skin that was got from the box
    [x] In the card showing the skin gotten, integrate the Buyback button the same way we have on test-mint page, but keep the feature to only allow claiming if the steam url is set
    [x] If the user does not click on buyback and goes to set the steam url to claim the skin, you should store the skin in user's inventory as a pending skin, this pending skin need to be fetched on inventory page and the user should be allowed to claim this skin on inventory page later(only if steam url is set)
    [x] If user claims skin, it should send the ticket on discord putting his address, NFT mint address and the info we already send it
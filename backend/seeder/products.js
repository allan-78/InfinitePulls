const buildSampleProducts = (adminId) => {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(nextMonth.getDate() + 30);

  return [
    {
      name: 'Pokemon Scarlet & Violet Booster Pack',
      price: 299,
      discountedPrice: 249,
      discountPercentage: 17,
      discountStartDate: now,
      discountEndDate: nextMonth,
      isOnSale: true,
      description: 'A sealed Pokemon booster pack with fresh Scarlet & Violet pulls for collectors and casual rippers.',
      images: [
        {
          public_id: 'seed_pokemon_scarlet_violet_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/pokemon-pack.jpg',
        },
      ],
      category: 'Pokemon',
      condition: 'Mint',
      seller: adminId,
      stock: 32,
      ratings: 4.8,
      numOfReviews: 12,
      isActive: true,
    },
    {
      name: 'One Piece Wings of the Captain Booster Pack',
      price: 349,
      description: 'Official One Piece TCG sealed pack built for players chasing meta staples and collectors chasing alt arts.',
      images: [
        {
          public_id: 'seed_one_piece_wings_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/one-piece-pack.jpg',
        },
      ],
      category: 'One Piece',
      condition: 'Mint',
      seller: adminId,
      stock: 24,
      ratings: 4.7,
      numOfReviews: 8,
      isActive: true,
    },
    {
      name: 'Magic: The Gathering Play Booster Pack',
      price: 325,
      discountedPrice: 289,
      discountPercentage: 11,
      discountStartDate: now,
      discountEndDate: nextMonth,
      isOnSale: true,
      description: 'A sealed MTG play booster pack ideal for drafts, cracking value, and building out your binder.',
      images: [
        {
          public_id: 'seed_mtg_play_booster_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/mtg-pack.jpg',
        },
      ],
      category: 'Magic: The Gathering',
      condition: 'Mint',
      seller: adminId,
      stock: 40,
      ratings: 4.9,
      numOfReviews: 17,
      isActive: true,
    },
    {
      name: 'NBA Hoops Premium Sports Card Pack',
      price: 275,
      description: 'A sealed sports card pack with NBA rookie hunt energy and a clean rip for basketball collectors.',
      images: [
        {
          public_id: 'seed_nba_hoops_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/nba-pack.jpg',
        },
      ],
      category: 'Sports',
      condition: 'Mint',
      seller: adminId,
      stock: 18,
      ratings: 4.5,
      numOfReviews: 6,
      isActive: true,
    },
    {
      name: 'Yu-Gi-Oh! Duelist Nexus Booster Pack',
      price: 260,
      description: 'A sealed Yu-Gi-Oh! booster pack for duelists hunting staples, foil upgrades, and collector pieces.',
      images: [
        {
          public_id: 'seed_yugioh_duelist_nexus_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/yugioh-pack.jpg',
        },
      ],
      category: 'Yu-Gi-Oh!',
      condition: 'Mint',
      seller: adminId,
      stock: 28,
      ratings: 4.6,
      numOfReviews: 9,
      isActive: true,
    },
    {
      name: 'Dragon Ball Fusion World Starter Pack',
      price: 420,
      description: 'A sealed Dragon Ball pack with bold character art and beginner-friendly value for new collectors.',
      images: [
        {
          public_id: 'seed_dragon_ball_fusion_pack',
          url: 'https://res.cloudinary.com/demo/image/upload/v1690000000/infinitepulls/dragonball-pack.jpg',
        },
      ],
      category: 'Dragon Ball',
      condition: 'Mint',
      seller: adminId,
      stock: 14,
      ratings: 4.4,
      numOfReviews: 5,
      isActive: true,
    },
  ];
};

module.exports = buildSampleProducts;

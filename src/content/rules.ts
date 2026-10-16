/** Every number for a round and a run. *tune*: see docs/balance/ for the simulator results. */
export const RULES = {
  /** Dice in the cup (the Second Cup adds one). */
  cup: 6,
  /** Rolls for a whole round, shared by every hand you play in it. */
  rolls: 24,
  /** Returns: send a set from your rack back. */
  returns: 2,
  /** A die that keeps landing on flowers and seasons rerolls at most this many times a roll. */
  bonusRerolls: 3,
  /** A kong gives this many free rolls. */
  kongRolls: 1,
  /** Fewest dice you may keep when selling. */
  minDice: 3,
  /** Rounds: each wind plays a plain round, then its host's round. */
  targets: [1000, 2000, 3000, 4500, 7000, 11000, 17000, 26000],
  money: {
    start: 4,
    /** Base pay for a plain round and a host round. */
    plain: 3,
    host: 5,
    perRoll: 1,
    maxRollPay: 5,
    perReturn: 1,
    interestPer: 5,
    maxInterest: 5,
  },
  shop: {
    charms: 2,
    dice: 2,
    tools: 2,
    pages: 1,
    pagePrice: 3,
    reroll: 2,
    dieSell: 2,
  },
  gift: { dice: 3 },
  bonus: {
    flowerChips: 25,
    seasonMult: 3,
    /** Own wind's flower or season counts this many times. */
    ownWind: 2,
    /** All four flowers, or all four seasons, in one hand. */
    fullSetX: 2,
  },
} as const;

const corsOptions = {
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.CLIENT_URL,
      "https://charming-queijadas-190feb.netlify.app",
    ],
    credentials: true,
  }

  export {corsOptions}
const corsOptions = {
    origin: [
      "https://chat-sockets-oxsl.onrender.com",
      "http://localhost:5173",
      "http://localhost:4173",
      process.env.CLIENT_URL,
      "https://infotechsol.vercel.app",
      "https://infotechsol.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }

  export {corsOptions}
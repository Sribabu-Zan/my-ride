/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        brand: "#000000",
        accent: "#009b49",
      },
    },
  },
  plugins: [],
};

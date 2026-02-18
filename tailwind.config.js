/** @type {import('tailwindcss').Config} */
module.exports = {
  // Ensure this covers every folder where you have code
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
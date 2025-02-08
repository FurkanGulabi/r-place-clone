import React, { useEffect, useState } from "react";
function generateRandomUsername() {
  // Define the username prefix
  const prefix = "user";

  // Generate a random number with 6 digits
  const randomNumber = Math.floor(100000 + Math.random() * 900000);

  // Combine prefix and random number to create the username
  const username = `${prefix}${randomNumber}`;

  return username;
}

const App = () => {
  const [canvas, setCanvas] = useState([]);
  const [selectedColor, setSelectedColor] = useState("red");
  const [isCooldown, setIsCooldown] = useState(false);

  const COLORS = [
    "red",
    "blue",
    "green",
    "yellow",
    "purple",
    "orange",
    "pink",
    "cyan",
    "brown",
    "white",
    "black",
    "gray",
  ];

  // Fetch canvas data every second
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`https://rplace-backend.furkangulabi.com/canvas`)
        .then((response) => response.json())
        .then((data) => setCanvas(data.canvas))
        .catch((error) => console.error("Error fetching canvas:", error));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle pixel placement
  const placePixel = (x, y) => {
    if (isCooldown) {
      alert("Cooldown in effect. Please wait.");
      return;
    }

    fetch(`https://rplace-backend.furkangulabi.com/place-pixel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: generateRandomUsername(), // Replace with actual user ID if implemented
        x,
        y,
        color: selectedColor,
      }),
    })
      .then((response) => {
        if (response.status === 429) {
          alert("Cooldown in effect. Please wait.");
        } else if (response.status === 200) {
          setIsCooldown(true);
          setTimeout(() => setIsCooldown(false), 100); // 30-second cooldown
        }
      })
      .catch((error) => console.error("Error placing pixel:", error));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold  mb-6 !text-red-400">Pixel Game</h1>

      {/* Color Picker */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Select Color:</h3>
        <div className="flex gap-2">
          {COLORS.map((color) => (
            <div
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-10 h-10 rounded-full cursor-pointer border-4 ${
                selectedColor === color ? "border-black" : "border-transparent"
              }`}
              style={{ backgroundColor: color }}
            ></div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div
        className="grid grid-cols-50 gap-[1px] border border-gray-300"
        style={{
          gridTemplateColumns: `repeat(50, 10px)`,
        }}
      >
        {canvas.map((pixel, index) => (
          <div
            key={index}
            onClick={() => placePixel(pixel.x, pixel.y)}
            className="w-2.5 h-2.5 cursor-pointer"
            style={{ backgroundColor: pixel.color }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default App;

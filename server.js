const express = require("express");
const session = require("express-session");
const http = require("http");
const { Server } = require("socket.io");


const app = express();
const server = http.createServer(app);
const io = new Server(server);

require('dotenv').config()

const DELICACIES = {
  2: "Egusi Soup and Fufu",
  3: "Ogbono Soup and Fufu",
  4: "Fried Rice and Chicken",
  5: "Jellof Rice and Chicken",
  6: "Pepper Soup",
  7: "Nkwobi",
  8: "Roasted Fish."
};

const orderHistory = [];

//Storing User Session Based On Device
app.use((req, res, next) => {
  const deviceID = req.ip; // Get the device's IP address
  req.session = req.session || {}; // Initialize req.session if it doesn't exist
  req.session.deviceID = deviceID; // Set the device ID in the session
  next();
});

const sessionMiddleware = session({
  secret: process.env.secret,
  resave: false,
  saveUninitialized: true,
});



app.use(express.static("user_interface"));
app.use(sessionMiddleware);

app.get("/", async (req, res) => {
  try {
    res.sendFile(__dirname + "/user_interface");
  } catch (err) {
    console.log(err);
    res.status(500);
  }
});

let currentOrder = [];

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res, next);
});

io.on("connection", (socket) => {
  console.log("User has joined:", socket.id);

  
    
  
  
  let userName = "";
  socket.emit("bot-message", "Hello! What is your name?");

  const botMessage = async (message) => {
    console.log("ChatBot message received:", message);
    socket.emit("bot-message", message);
  };

  const userMessage = async (message) => {
    console.log("User message received:", message);

    try {
      if (!userName) {
        // sends welcome message and updates username
        userName = message;
        await botMessage(
          `Welcome to the Soft Eatries, ${userName}! 
          Please Follow The Prompt. 
          Press \n1 To Place Order.  Press\n99 To Checkout Order. Press \n98 To See Order HIstory. Press \n97 To See Current Order. Press \n0 To Cancel order`
        );
      } else {
        switch (message) {
          case "1":
            // Glist of items
            const itemOptions = Object.keys(DELICACIES)
              .map((key) => `${key}. ${DELICACIES[key]}`)
              .join("\n");
            await botMessage(
              `Here is our Food Menu:\n ${itemOptions} \nPlease select one by typing its number.`
            );
            break;
          case "2":
          case "3":
          case "4":
          case "5":
          case "6":
          case "7":
          case "8":
            // Parse the number from the user input and add the corresponding item to the current order
            const selectedIndex = parseInt(message);
            if (DELICACIES.hasOwnProperty(selectedIndex)) {
              const selectedItem = DELICACIES[selectedIndex];
              currentOrder.push(selectedItem);
              await botMessage(
                `${selectedItem} has been added to your order. Do you want to add more items to your order? Type numbers. If not, type 99 to checkout.`
              );
            } else {
              await botMessage("Invalid selection.");
            }
            break;
          case "99":
            if (currentOrder.length === 0) {
              await botMessage(
                "No order to place. Place an order\n1. See menu"
              );
            } else {
              orderHistory.push(currentOrder);
              await botMessage("Order placed");
              currentOrder = [];
            }
            break;
          case "98":
            if (orderHistory.length === 0) {
              await botMessage("No previous orders");
            } else {
              const orderHistoryString = orderHistory
                .map(
                  (order, index) => `Order ${index + 1}. ${order.join(", ")}`
                )
                .join("\n");
              await botMessage(
                `Here are your previous orders:\n${orderHistoryString}`
              );
            }
            break;
          case "97":
            if (currentOrder.length === 0) {
              await botMessage("No current order");
            } else {
              const currentOrderString = currentOrder.join(", ");
              await botMessage(
                `Here is your current order:\n${currentOrderString}`
              );
            }
            break;
          case "0":
            if (currentOrder.length === 0) {
              await botMessage("No order to cancel");
            } else {
              currentOrder = [];
              await botMessage("Order canceled");
            }
            break;
          default:
            await botMessage("Invalid input");
        }
      }
    } catch (err) {
      console.log(err);
      await botMessage("An error occurred while processing your request.");
    }
  };

  socket.on("user-message", userMessage);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

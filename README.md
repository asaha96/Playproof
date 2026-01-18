# Playproof

Playproof is a modern verification SDK designed to distinguish between humans and bots through interactive deployments. It replaces legacy CAPTCHAs with branded verification experiences while maintaining strong security guarantees.

## 🌟 Features

- **Deployment-Based Verification**: Users complete deployments (Bubble Pop, Target Click) to verify humanity.
- **Bot Detection**: Analyzes behavior patterns during verification flows to calculate confidence scores.
- **Smart Rotation**: Automatically rotates between different deployment types and retries.
- **Customizable Theme**: Fully themable to match your application's design.
- **Modern Stack**: Built with vanilla JavaScript for the SDK (no heavy dependencies) and compatible with any framework.

## 📂 Project Structure

This is a monorepo containing the following workspaces:

- `packages/playproof/`: The core SDK package.
- `demo-app/`: A Next.js application demonstrating the SDK usage.
- `apps/web`: The primary web application.
- `convex/`: The backend infrastructure.

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Playproof
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Project

You can run the different parts of the project using the following commands from the root:

- **Run the Demo App**:
  ```bash
  npm run dev:demo
  ```
  This will start the Next.js demo application, usually at `http://localhost:3001`.

- **Run the Web App**:
  ```bash
  npm run dev:web
  ```

- **Run Convex Dev**:
  ```bash
  npm run convex:dev
  ```

- **Build Utilities**:
  ```bash
  npm run build:demo
  ```

## 🛠️ SDK Usage

To use Playproof in your application:

1. **Import the SDK**:
   ```javascript
   import Playproof from 'playproof'; // Adjust path if using locally or via package manager
   ```

2. **Initialize & Verify**:
   ```javascript
   const playproof = new Playproof({
     containerId: 'captcha-container', // ID of the DOM element to render in
     theme: {
       primary: '#6366f1',
       secondary: '#8b5cf6',
       background: '#1e1e2e',
       // ... customization options
     },
     onSuccess: (result) => {
       console.log('Verified!', result.score);
     },
     onFailure: (result) => {
       console.log('Verification failed', result);
     }
   });

   // Start the verification process
   playproof.verify();
   ```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

## 📄 License

MIT

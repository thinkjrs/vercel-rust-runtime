# **Next.js + Rust on Vercel Demo**

This is a demo project showcasing how to run a compute-intensive Rust backend as a Vercel Serverless Function, with a Next.js frontend to display the results.  
It runs Monte Carlo simulations for asset prices on the Rust backend and visualizes the results using Chart.js in the Next.js frontend.

## **🤖 Tech Stack**

- **Frontend:** Next.js, React, TypeScript, Chart.js, Tailwind CSS
- **Backend:** Rust, vercel-rust runtime

## **⚙️ How it Works**

1. **Frontend:** The Next.js app in the app/ directory provides the UI and sliders for adjusting simulation parameters.
2. **API Request:** When a user changes a parameter, the frontend makes a fetch request to /api/test.
3. **Vercel Routing:** Vercel routes this request to the compiled Rust function api/test.rs (defined in vercel.json).
4. **Rust Backend:** The Rust function parses the query parameters, runs the Monte Carlo simulations (using rand_distr), and returns the results as a JSON payload.
5. **Visualization:** The frontend receives the JSON and uses Chart.js to render the simulation graphs.

## **🚀 Running Locally**

This project requires a specific setup to run both the Next.js frontend and the Rust API side-by-side.  
**Prerequisites:**

- [Node.js](https://nodejs.org/)
- [Rust Toolchain](https://www.rust-lang.org/tools/install) (including cargo)
- [Vercel CLI](https://vercel.com/docs/cli)

### **Step 1: Clone and Install Dependencies**

git clone [https://github.com/thinkjrs/vercel-rust-runtime.git](https://github.com/thinkjrs/vercel-rust-runtime.git)  
cd vercel-rust-runtime

# Install frontend dependencies

`npm install`

### **Step 2: Build the Rust API**

The Vercel dev server (vercel dev) **requires the Rust binary to be compiled in release mode** before it can be served.  
`cargo build --release`

This compiles your api/test.rs file and places the executable in the target/release/ directory, where vercel dev expects to find it.

### **Step 3: Run the Development Server**

You **must** use vercel dev, not npm run dev.  
The npm run dev command only starts the Next.js server and is unaware of your Rust API in the api/ directory, which will result in 404 errors. The vercel dev command reads your vercel.json and spins up an environment that serves _both_ the frontend and the Rust API.

#### If you haven't already, install the Vercel CLI

`npm install -g vercel`

#### Run the Vercel dev server

`vercel dev`

Your application should now be running at http://localhost:3000, and the frontend will be able to successfully fetch data from your local Rust API.

## **📄 API Documentation**

### **GET /api/test**

Runs a series of Monte Carlo simulations for a simple asset price path.

#### **Query Parameters**

| Parameter      | Type  | Default     | Description                                                |
| :------------- | :---- | :---------- | :--------------------------------------------------------- |
| samples        | usize | 10          | The number of distinct simulations (paths) to generate.    |
| size           | usize | 100         | The number of time steps (e.g., days) for each simulation. |
| starting_value | f32   | 50.0        | The initial asset price.                                   |
| mu             | f32   | 0.001       | The expected drift or mean return.                         |
| sigma          | f32   | 0.015       | The expected volatility.                                   |
| dt             | f32   | 1.0 / 252.0 | The time step size (e.g., 1 day out of 252 trading days).  |

#### **Success Response (200 OK)**

Returns a JSON object containing the results.

```json
{
 "message": "Rust is the best!",
 "results": [
   [50.0, 50.12, 49.98, ...],
   [50.0, 49.89, 50.21, ...],
   [50.0, 50.05, 50.11, ...]
 ]
}
```

## **🌐 Deployment**

This project is configured for Vercel. Just push your repository to GitHub/GitLab/Bitbucket and import it into your Vercel account. Vercel will automatically detect the vercel-rust runtime via vercel.json and the Next.js frontend and build them both.

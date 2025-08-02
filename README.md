
# NeoRide Backend API for Vercel

This is a serverless version of the NeoRide backend API, optimized for deployment on Vercel.

## Important: MongoDB Connection in Vercel

If you're experiencing issues with MongoDB connections in Vercel (data not being saved), follow these troubleshooting steps:

1. **Check MongoDB Atlas Network Access**: Make sure your MongoDB Atlas cluster allows connections from anywhere (IP: 0.0.0.0/0)
2. **Verify Environment Variables**: Ensure the MONGODB_URI environment variable is correctly set in Vercel
3. **Test API Endpoints**: Use the `/api/health` and `/api/debug` endpoints to verify connectivity
4. **Check Logs**: Review Vercel logs for any connection errors

## Deployment Instructions

### Step 1: Prepare Your Repository

1. Create a new GitHub repository for this backend project
2. Push this code to the repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Go to [Vercel](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: Node.js
   - Root Directory: ./
   - Build Command: `npm install`
   - Output Directory: ./
   - Install Command: `npm install`
5. Add the following environment variable:
   - `MONGODB_URI`: Your MongoDB connection string
   ```
   mongodb+srv://avikmodak83:Avik%402005@cluster0.vvhbnvm.mongodb.net/NeoRide?retryWrites=true&w=majority&appName=Cluster0
   ```
6. Click "Deploy"

### Step 3: Update Your Frontend

After deployment, update your frontend to use the new API URL:

1. Get your Vercel deployment URL (e.g., `https://neoride-backend.vercel.app`)
2. Update the `.env` file in your frontend project:
   ```
   VITE_API_BASE_URL=https://your-backend-url.vercel.app/api
   ```
3. Update your `vercel.json` in the frontend project to proxy API requests:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://your-backend-url.vercel.app/api/:path*"
       },
       {
         "source": "/((?!api/.*).*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

## API Endpoints

### Health Check
- **GET** `/api/health` - Check if the API is running

### Customer Endpoints
- **POST** `/api/customers` - Create a new customer
- **GET** `/api/customers/:supabaseId` - Get customer by Supabase ID
- **PUT** `/api/customers/:supabaseId` - Update customer
- **DELETE** `/api/customers/:supabaseId` - Delete customer

### Driver Endpoints
- **POST** `/api/drivers` - Create a new driver
- **GET** `/api/drivers/:supabaseId` - Get driver by Supabase ID
- **PUT** `/api/drivers/:supabaseId` - Update driver
- **DELETE** `/api/drivers/:supabaseId` - Delete driver

### Statistics
- **GET** `/api/stats` - Get database statistics

## Troubleshooting

If you encounter issues with MongoDB connection:

1. Make sure your MongoDB Atlas cluster is accessible from Vercel
2. Add `0.0.0.0/0` to your MongoDB Atlas IP whitelist to allow connections from anywhere
3. Check that your connection string is correctly formatted and URL-encoded
4. Verify that your MongoDB user has the correct permissions


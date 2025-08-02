# NeoRide Backend API Troubleshooting Guide

## Common Issues and Solutions

### "Route not found" Error

If you're seeing a "Route not found" error when accessing your API endpoints:

1. **Check your Vercel deployment URL**:
   - Make sure you're using the correct URL for your Vercel deployment
   - Verify that you're including the correct path (e.g., `/api/health`)

2. **Verify your vercel.json configuration**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "index.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/index.js"
       },
       {
         "src": "/(.*)",
         "dest": "/index.js"
       }
     ]
   }
   ```

3. **Check your API routes in index.js**:
   - Make sure all routes are properly defined
   - Verify that the route paths match what you're trying to access

4. **Test the root endpoint**:
   - Try accessing just the root URL (e.g., `https://your-vercel-url.vercel.app/`)
   - If this works but specific routes don't, there's an issue with your route definitions

### MongoDB Connection Issues

If data isn't being saved to MongoDB:

1. **Check MongoDB Atlas Network Access**:
   - Go to MongoDB Atlas → Network Access
   - Add `0.0.0.0/0` to allow connections from anywhere
   - This is crucial for Vercel serverless functions

2. **Verify Environment Variables**:
   - In Vercel dashboard, go to your project → Settings → Environment Variables
   - Make sure `MONGODB_URI` is correctly set with your connection string
   - Add the variable to all environments (Production, Preview, Development)
   - Double-check that the connection string is properly URL-encoded (especially the password)

3. **Test MongoDB Connection**:
   - Use the `/api/health` endpoint to check if MongoDB is connected
   - Use the `/api/debug` endpoint to verify environment variables
   - Try the direct connection test at `/api/mongodb-test`

4. **Check for Connection Errors**:
   - In Vercel dashboard, go to your project → Deployments → Latest deployment → Functions
   - Click on a function to view logs
   - Look for any MongoDB connection errors

5. **Test Direct Connection**:
   - Run the `test-mongodb.js` script locally to test direct connection:
   ```bash
   node test-mongodb.js
   ```
   - If this works but the API doesn't, the issue is in the API code

6. **Common MongoDB Connection Errors**:
   - **"Cannot read properties of undefined (reading 'admin')"**: The MongoDB connection hasn't been established before trying to use it
   - **"MongoServerSelectionError: connection timed out"**: Network issue or IP not whitelisted
   - **"MongoError: Authentication failed"**: Incorrect username/password in connection string
   - **"MongoNetworkError: failed to connect"**: Network issue or incorrect hostname

### Debugging Steps

1. **Local Testing**:
   - Run `npm run dev` to start the server locally
   - Test endpoints with a tool like Postman or using `curl`
   - Check console for any error messages

2. **Vercel Deployment Verification**:
   - After deployment, update the `deployment-config.json` file with your Vercel URL
   - Run `node verify-deployment.js` to test all endpoints

3. **Manual API Testing**:
   - Use a browser to access `https://your-vercel-url.vercel.app/api/health`
   - Check the response for MongoDB connection status

4. **Logging**:
   - Add more console.log statements to your code for debugging
   - Check logs in Vercel dashboard

## Specific Error Solutions

### Error: "Cannot find module 'mongoose'"

```
npm install mongoose
```

### Error: "MongoServerSelectionError: connection timed out"

- Check MongoDB Atlas IP whitelist
- Verify connection string is correct
- Test if MongoDB Atlas is accessible

### Error: "TypeError: Cannot read property 'db' of undefined"

- MongoDB connection hasn't been established
- Check connection code in index.js
- Make sure you're waiting for the connection to be established before using it

## Contact Support

If you continue to experience issues, please contact:
- MongoDB Atlas Support: https://support.mongodb.com/
- Vercel Support: https://vercel.com/support
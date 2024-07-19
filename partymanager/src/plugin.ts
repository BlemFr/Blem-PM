import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { IncrementCounter } from "./actions/increment-counter";
import express, { Request, Response } from 'express';
import axios from 'axios';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';

// Set up logging for Stream Deck
streamDeck.logger.setLevel(LogLevel.TRACE);

// Register the increment action
streamDeck.actions.registerAction(new IncrementCounter());

// Connect to the Stream Deck
streamDeck.connect();

// Set up Express server
const app = express();
const port = 5255;

// Path to device authentication data
const deviceAuthPath = path.join(__dirname, '../deviceAuth.json');

// Handle authentication form submission
app.get('/authenticate', async (req: Request, res: Response) => {
    try {
        // Step 1: Initiate authentication request
        const authResponse = await axios.get('https://blem.konik.co.uk/epic/device/auth');
        const { verification_uri, device_code } = authResponse.data;

        // Redirect user to the verification URL
        res.redirect(verification_uri);

        // Step 2: Poll for authorization
        let authorized = false;
        while (!authorized) {
            const codeResponse = await axios.post(
                'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
                `grant_type=device_code&device_code=${device_code}`,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic OThmN2U0MmMyZTNhNGY4NmE3NGViNDNmYmI0MWVkMzk6MGEyNDQ5YTItMDAxYS00NTFlLWFmZWMtM2U4MTI5MDFjNGQ3`
                    }
                }
            );

            if (codeResponse.status === 200) {
                const authData = codeResponse.data;
                const { access_token } = authData;

                // Save device authentication data
                const deviceAuthData = await createDeviceAuth(authData);
                

                authorized = true;
            } else {
                // Handle polling delay (e.g., wait and retry)
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
            }
        }

        res.send('Authentication successful!');

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).send('Authentication failed');
    }
});

// Function to create device authentication
async function createDeviceAuth(auth: any) {
    try {
		const response = await axios.post(`https://account-public-service-prod.ol.epicgames.com/account/api/public/account/${auth.account_id}/deviceAuth`, {}, {
			headers: {
				"Authorization": `Bearer ${auth.access_token}`
			},
			
		});

		writeFileSync(deviceAuthPath, JSON.stringify(response.data));
        return response.data;
    } catch (error: any) {
        throw new Error('Failed to create device authentication: ' + error.message);
    }
}

// Function to check if the user is authenticated
export async function isAuthenticated(): Promise<boolean> {
    try {
        if (existsSync(deviceAuthPath)) {
            const deviceAuthData = JSON.parse(readFileSync(deviceAuthPath, 'utf-8'));
            // Additional validation can be added if needed
            return !!deviceAuthData;
        }
        return false;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
}

// Start the server
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

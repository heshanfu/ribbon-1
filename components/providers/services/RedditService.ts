import { AuthSession } from 'expo';
import { AsyncStorage, Platform } from 'react-native';
import credentials from './credentials';
import { Buffer } from 'buffer';
import appInfo from '../../../app.json';

const CLIENT_ID = credentials.reddit.clientId;
const REDIRECT_URL = AuthSession.getRedirectUrl();
const BEARER_TOKEN = new Buffer(`${CLIENT_ID}:`).toString('base64');
const STORAGE_REDDIT_KEY = '@Bookmarks:RedditOAuthKey';
const STORAGE_REDDIT_USERNAME = '@Bookmarks:RedditUsername'
const USER_AGENT = `${Platform.OS}:${appInfo.expo.android.package}:${appInfo.expo.version} (by /u/${credentials.reddit.creatorUsername})`


/**
 * Open a browser to initiate the OAuth 2 process
 * After a successful login it will save the token in AsyncStorage
 *
 * @returns {boolean}
 */
export async function SignIn(): Promise<RedditToken> {
  const state = new Date().valueOf().toString();
  const authUrl = getAuthUrl(state);
  const result = await AuthSession.startAsync({ authUrl: authUrl });
  
  if (result.type === 'dismiss') throw new Error('Dismiss');
  if (result.type !== 'success') throw new Error('Error');
  
  const { params } = result;

  if (params.state !== state) throw new Error('State does not match');
  if (params.error === 'access_denied') {
    alert('Reddit OAuth access denied.')
    throw new Error('Reddit OAuth access denied.');
  }

  const token = await createToken(params.code);
  await AsyncStorage.setItem(STORAGE_REDDIT_KEY, JSON.stringify(token));

  await getRedditUsername();

  return token
}


/**
 * Construct the OAuth URL
 * Used variables :
 * CLIENT_ID - The Reddit client id (not secret)
 * REDIRECT_URL - Should match the Redirect URI field of the Reddit app
 * state - The date string, to get a somewhat unique value
 *
 * @param {string} state
 * @returns {string}
 */
function getAuthUrl(state: string) {
  return (
    'https://www.reddit.com/api/v1/authorize.compact' +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}` +
    `&duration=permanent` +
    `&scope=${encodeURIComponent(`history identity`)}`
  )
}


/**
 * Called by SignIn()
 * It will fetch the `access_token` endpoint
 * to get the token
 *
 * @param {*} code
 * @returns
 */
async function createToken(code): Promise<RedditToken> {
  const url = (
    `https://www.reddit.com/api/v1/access_token` +
    `?grant_type=authorization_code` +
    `&code=${code}` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`
  );

  const token: RedditToken = await (await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${BEARER_TOKEN}`,
      'User-Agent': USER_AGENT
    },
  })).json();

  return {
    ...token,
    token_date: Date.now()
  }
}

async function getRedditUsername(): Promise<string> {
  const token = await getToken();

  const url = `https://oauth.reddit.com/api/v1/me/`

  const response = await fetch(url, {
    headers: {
      'Authorization': `bearer ${token.access_token}`,
      'User-Agent': USER_AGENT
    }
  })

  const data = await response.json();

  await AsyncStorage.setItem(STORAGE_REDDIT_USERNAME, data.username);

  return data.username;
}

export async function bootstrapAppData() {
  const token = await getToken();
  const now = Date.now();

  // If the user is not present, the user is logged out
  if (!token) {
    return false
  }

  // Token expired
  if (token.token_date - now >= 3600 * 1000) {
    console.log('Token expired : ', token.token_date - now);
    await refreshToken()
  }

  // If token is present and valid, log the user in
  return true
}

export async function getSavedPosts() {
  const token = await getToken();
  const username = await AsyncStorage.getItem(STORAGE_REDDIT_USERNAME);

  const url = `https://oauth.reddit.com/api/v1/user/${username}/saved`
  const body = `show=all&limit=100`

  console.log(url);
  console.log(token.access_token);

  const response = await fetch(url, {
    headers: {
      'Authorization': `bearer ${token.access_token}`,
      'User-Agent': USER_AGENT
    },
    body
  })

  const posts = await response.json();

  return posts
}


/**
 * It will refresh the token
 * A token expires every hour
 * TODO
 */
export async function refreshToken() {
  const token = await getToken()

  const url = 'https://www.reddit.com/api/v1/access_token'

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${BEARER_TOKEN}`,
    },
    body: `grant_type=refresh_token` + 
          `&refresh_token=${token.access_token}`
  })

  const newToken = await response.json();

  await AsyncStorage.setItem(STORAGE_REDDIT_KEY, JSON.stringify(newToken));

  return {
    ...newToken,
    token_date: Date.now()
  };
}


/**
 * Get the token object from AsyncStorage
 *
 * @returns {object}
 */
export async function getToken(): Promise<RedditToken> {
  const token = await AsyncStorage.getItem(STORAGE_REDDIT_KEY);
  return JSON.parse(token);
}


/**
 * Revoke the token
 * TODO
 * @returns {boolean}
 */
export async function Disconnect(): Promise<any> {
  try {
    const token = await getToken()

    const url = 'https://www.reddit.com/api/v1/revoke_token'
  
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${BEARER_TOKEN}`,
      },
      body: `token_type_hint=access_token` + 
            `&token=${token.access_token}`
    })
  
    await AsyncStorage.removeItem(STORAGE_REDDIT_KEY);
  } catch (error) {
    await AsyncStorage.removeItem(STORAGE_REDDIT_KEY);
  }
}
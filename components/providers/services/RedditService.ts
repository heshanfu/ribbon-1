import { AuthSession } from 'expo';
import { AsyncStorage } from 'react-native';
import credentials from './credentials';

const CLIENT_ID = credentials.reddit.clientId;
const REDIRECT_URL = AuthSession.getRedirectUrl();
const STORAGE_REDDIT_KEY = '@Bookmarks:RedditOAuthKey';

async function SignIn () {
  try {
    const state = new Date().valueOf().toString();
    const authUrl = getAuthUrl(state);
    console.log(authUrl);
    
    const result = await AuthSession.startAsync({ authUrl });

    if (result.type !== 'success') return alert(`Error: ${JSON.stringify(result)}`);
    
    const { params } = result

    if (params.state !== state) return alert(`State does not match`);

    const token = await createToken(params.code);
    
    console.log(token);
    AsyncStorage.setItem(STORAGE_REDDIT_KEY, JSON.stringify(token));
  } catch (error) {
    console.error(error);
    return null;
  }
}

function getAuthUrl(state) {
  return (
    'https://www.reddit.com/api/v1/authorize.compact' +
    `?client_id=${CLIENT_ID}` +
    `&response_type=code` +
    `&state=${state}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}` +
    `&duration=permanent` +
    `&scope=history`
  )
}

async function createToken(code) {
  const url = (
    `https://www.reddit.com/api/v1/access_token` +
    `?grant_type=authorization_code` +
    `&code=${code}` +
    `&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URL)}`
  );

  const bearerToken = new Buffer(`${CLIENT_ID}:`).toString('base64');

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${bearerToken}`,
    },
  }).then(res => res.json());
}

async function getOauth () {
  const oauth = await AsyncStorage.getItem(STORAGE_REDDIT_KEY);
  return JSON.parse(oauth);
}

async function Disconnect () {
  await AsyncStorage.removeItem(STORAGE_REDDIT_KEY);
}

export { SignIn, getOauth, Disconnect };
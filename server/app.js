require('dotenv').config()
// const Router = require('./routes/router.js')
const port = process.env.PORT || 4000
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()
const fetch = require('node-fetch')
const request = require('request')
const cors = require('cors')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = (length) => {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };
  
let stateKey = 'spotify_auth_state';
  

app
    .use(express.static(path.join(__dirname + "/static")))
    .use(bodyParser.urlencoded({ extended: true }))
    .use(cors())
    .use(cookieParser())
    .set("views", __dirname + "/view/pages")
    .set("view engine", "ejs")
    .get('/', homeRoute)
    .get('/callback', (req, res) => {

        
        let code = req.query.code || null
        let state = req.query.state || null
        let storedState = req.cookies ? req.cookies[stateKey] : null

        console.log('state: ', state)
        console.log('storedState: ', storedState)
        console.log('storedState: ', req.cookies)

        

        if(state === null || state !== storedState){
            res.redirect('/' + 
            querystring.stringify({
                error: 'state_mismatch'
            }))
        } else {
            res.clearCookie(stateKey)
        

        let authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: process.env.REDIRECT_URI,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
            },
            json: true
        }

        request.post(authOptions, (error, response, body) => {
            
            if(!error && response.statusCode === 200){

            console.log('body: ', body)
            
            
            let access_token = body.access_token
            let refresh_token = body.refresh_token


            let options = {
                url: 'https://api.spotify.com/v1/me',
                headers: { 'Authorization': 'Bearer ' + access_token },
                json: true
              };

                      // use the access token to access the Spotify Web API
        request.get(options, (error, response, body) => {
            console.log(body);
            res.render('logged-in', {
                data: body,
                token: access_token
            })
          });
        } else{
            res.redirect('/' + 
                querystring.stringify({
                    error: 'invalid_token'
                }))
        }
    })

}
        
})
.get('/refresh_token', (req, res) => {

    //requesting acces token from refresh token
    let refresh_token = req.query.refresh_token

    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    }

    request.post(authOptions, (error, response, body) => {
        if(!error && response.statusCode === 200){
            let access_token = body.access_token
            res.send({
                'access_token': access_token
            })
        }
    })
})
.get('/searchResults', (req, res) => {
    
    console.log(req.query)

    let artist = req.query.searchValue
    let access_token = req.query.token
    let userData = JSON.parse(req.query.data)

    let options = {
        url: `https://api.spotify.com/v1/search?q=${artist}&type=track%2Cartist&market=US&limit=10&offset=5`,
        headers: { 'Authorization': 'Bearer ' + access_token },
        json: true
    };

    request.get(options, (error, response, body) => {
        // console.log('body: ', body)
        // console.log('tracks: ', body.tracks.items[0].album)
        // console.log('tracks: ', body.tracks)
        // console.log('artists: ', body.artists)
     

        res.render("search-results", {
            trackData: body.tracks,
            data: userData,
            token: access_token
        })
    })


        
})

app.listen(port, () => {
    console.log(`Dev app listening on port: ${port}`)
})

function homeRoute(req, res){

    let state = generateRandomString(16)

    res.cookie(stateKey, state)
    
    const scopes = 'user-read-private user-read-email';
    // const redirect_uri = process.env.REDIRECT_URI;

  res.redirect('https://accounts.spotify.com/authorize?' +
  querystring.stringify({
    response_type: 'code',
    client_id: process.env.CLIENT_ID,
    scope: scopes,
    redirect_uri: process.env.REDIRECT_URI,
    state: state
  }));
}

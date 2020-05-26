require('dotenv').config()
// const Router = require('./routes/router.js')
const Api = require('./modules/api.js')
const port = process.env.PORT || 4000
const express = require('express')
const bodyParser = require('body-parser')
const path = require('path')
const app = express()
const fetch = require('node-fetch')
const cors = require('cors')
const querystring = require('querystring')
const cookieParser = require('cookie-parser')
const { URLSearchParams } = require('url');

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

        if(state === null || state !== storedState){
            res.redirect('/' + 
            querystring.stringify({
                error: 'state_mismatch'
            }))
        } else {
            res.clearCookie(stateKey)

        let form = {
            code: code,
            redirect_uri: process.env.REDIRECT_URI,
            grant_type: 'authorization_code'
        }

        const params = new URLSearchParams();

        for(key in form){
            params.append(key, form[key])
        }

        // const spotifyToken = Api.getSpotifyToken(params)

        // console.log('SpotifyToken Function Module: ', spotifyToken)

        fetch(`https://accounts.spotify.com/api/token`, {
            method: 'post',
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
            },
            body: params,
            'Content-Type':'application/x-www-form-urlencoded'
        })
        .then(res => res.json())
        .then(body => {
            let access_token = body.access_token
            let refresh_token = body.refresh_token

            let options = {
                headers: { 'Authorization': 'Bearer ' + access_token },
              };

            // Api.getSpotifyUserInfo(options)

            fetch(`https://api.spotify.com/v1/me`, options)
                .then(res => {
                    if(!res.ok) {
                        
                        res.redirect('/' + 
                            querystring.stringify({
                                error: 'invalid_token'
                            }))
                    } else{
                        return res.json()
                    }
                })
                .then(body => {
                    res.render('logged-in', {
                    data: body,
                    token: access_token
                    })
                })
                .catch(err => {
                    throw Error(err);
                })
        })
}
        
})
.get('/refresh_token', (req, res) => {

    //requesting acces token from refresh token
    let refresh_token = req.query.refresh_token

    let form = {
        grant_type: 'refresh_token',
        refresh_token: refresh_token
    }

    const params = new URLSearchParams();

    for(key in form){
        params.append(key, form[key])
    }

    fetch(`https://accounts.spotify.com/api/token`, {
        method: 'post',
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(process.env.CLIENT_ID + ':' + process.env.CLIENT_SECRET).toString('base64'))
        },
        body: params,
        'Content-Type':'application/x-www-form-urlencoded'
    })
    .then(res => res.json())
    .then(body => {
        let access_token = body.access_token

        res.send({
            'access_token': access_token
        })
    })
})
.get('/searchResults', (req, res) => {
    
    console.log(req.query)

    let artist = req.query.searchValue
    let access_token = req.query.token
    let userData = JSON.parse(req.query.data)

    let options = {
        // url: `https://api.spotify.com/v1/search?q=${artist}&type=track%2Cartist&market=US&limit=10&offset=5`,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token },
        
    };
    
    fetch(`https://api.spotify.com/v1/search?q=${artist}&type=track%2Cartist&market=US&limit=10&offset=5`, options)
        .then(res => res.json())
        .then(body => {

            console.log(body.tracks.items[0].album.images)

            res.render("search-results", {
                trackData: body.tracks.items,
                data: userData,
                token: access_token
            })

        })        
})
.get('/track/:id/:token', (req, res) => {
    // res.render('track-detail')

    console.log(req.params)

    const trackId = req.params.id.substring(1)
    const access_token = req.params.token.substring(1)

    console.log(access_token)
    console.log(trackId)

    let options = {
        // url: `https://api.spotify.com/v1/search?q=${artist}&type=track%2Cartist&market=US&limit=10&offset=5`,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token },
        
    };


    fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, options)
        .then(res => res.json())
        .then(body => {
            console.log(body)
            res.render('track-detail', {
                data: body
            })
        })



})
.get('/inspireme', (req, res) => {
    let userData = JSON.parse(req.query.data)
    const valence = req.query.valence
    const energy = req.query.energy
    const danceability = req.query.danceability
    const acousticness = req.query.acousticness
    const access_token = req.query.token
    const genres = req.query.genre
    let genreQuery

    let options = {
        // url: `https://api.spotify.com/v1/search?q=${artist}&type=track%2Cartist&market=US&limit=10&offset=5`,
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token },
        
    };

    

    if(Array.isArray(genres)){
        // genres.pop()
        
        // const lastGenre = genres.pop()

        const lastElement = genres.splice(-1,1)


        let chainedArray = genres.map(genre => genre = `${genre}%2C`)

        genreQuery = chainedArray.join("") + lastElement

        fetch(`https://api.spotify.com/v1/recommendations?limit=20&market=US&target_acousticness=${acousticness}&target_danceability=${danceability}&target_energy=${energy}&target_valence=${valence}&seed_genres=${genreQuery}`, options)
            .then(res => res.json())
            .then(body => {

                console.log(body.tracks)

                res.render("search-results", {
                    trackData: body.tracks,
                    data: userData,
                    token: access_token
                })
            })
    } else {
        genreQuery = genres

        fetch(`https://api.spotify.com/v1/recommendations?limit=20&market=US&target_acousticness=${acousticness}&target_danceability=${danceability}&target_energy=${energy}&target_valence=${valence}&seed_genres=${genreQuery}`, options)
            .then(res => res.json())
            .then(body => {
                res.render("search-results", {
                    trackData: body.tracks,
                    data: userData,
                    token: access_token
                })
            })
    }
    
})

app.listen(port, () => {
    console.log(`Dev app listening on port: ${port}`)
})

function homeRoute(req, res){

    let state = generateRandomString(16)

    res.cookie(stateKey, state)
    
    const scopes = 'streaming user-read-private user-read-email user-modify-playback-state';
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

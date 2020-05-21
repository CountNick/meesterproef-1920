const homeRoute = (req, res) => {
    
    const scopes = 'user-read-private user-read-email';
    const redirect_uri = process.env.REDIRECT_URI;
    res.redirect('https://accounts.spotify.com/authorize' +
  '?response_type=code' +
  '&client_id=' + process.env.CLIENT_ID +
  (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
  '&redirect_uri=' + encodeURIComponent(redirect_uri));
}



module.exports = { homeRoute } 
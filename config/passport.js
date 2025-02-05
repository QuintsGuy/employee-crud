const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');
const dotenv = require('dotenv');
const cookieExtractor = function (req) {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies.jwtToken;
    }
    return token;
};

dotenv.config();

const opts = {
    jwtFromRequest: cookieExtractor,
    secretOrKey: process.env.JWT_SECRET
};

module.exports = (passport) => {
    passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
        try {
            const user = await User.findById(jwt_payload.id);
            if (user) return done(null, user);
            return done(null, false);
        } catch (err) {
            return done(err, false);
        }
    }));
};
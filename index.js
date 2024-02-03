const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const { WebhookClient, MessageEmbed } = require('discord.js'); // Add this line
const mongoose = require('mongoose');
const User = require('./models/User');
const PanelData = require('./models/Uptime');

// ...



const app = express();
const port = 3000;
app.set('view engine', 'ejs');
app.use(express.static('public'));

const clientId = "1170080401683910686"
const clientSecret = "IZl3DWBLfArJGHVCn_QjlJWt7G_2Wl9N";
const redirectUri = "http://localhost:3000/callback";

const webhookURL = "https://discord.com/api/webhooks/1202930574982127616/Hiu2c0p412PR6P1rIIO4e8bCsFbqodVd_IahMME2gXXB0hzxnaTEHMmjNjXR78UPYWDt";

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new DiscordStrategy({
  clientID: clientId,
  clientSecret: clientSecret,
  callbackURL: redirectUri,
  scope: ['identify'],
}, (accessToken, refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

app.get('/login', passport.authenticate('discord'));

mongoose.connect('mongodb+srv://mongo:mongo@cluster0.6us6keo.mongodb.net/', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});


app.get('/callback', passport.authenticate('discord', {
  failureRedirect: '/'
}), async (req, res) => {
  try {
    console.log(`User logged in: ${req.user.username}#${req.user.discriminator} (${req.user.id})`);

    const newUser = await User.findOneAndUpdate(
      { discordId: req.user.id },
      {
        discordId: req.user.id,
        username: req.user.username,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
      },
      { upsert: true, new: true }
    );

    const webhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1202930574982127616/Hiu2c0p412PR6P1rIIO4e8bCsFbqodVd_IahMME2gXXB0hzxnaTEHMmjNjXR78UPYWDt" });

    const embed = new MessageEmbed()
      .setColor('#0099ff')
      .setDescription(`** :inbox_tray:  ${req.user.username} Adlı Kullanıcı Siteye Giriş Yaptı! **`);

    webhook.send({ embeds: [embed] });

    res.redirect('/panel');
  } catch (error) {
    console.error('Error saving user to MongoDB:', error);
    res.redirect('/');
  }
});

app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});
app.get('/panel', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('pages/panel', { user: req.user });
  } else {
    res.redirect('/login');
  }
});
app.get('/panel/ekle', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const userLinks = await PanelData.find({ userId: req.user.id });

      res.render('pages/ekle', { user: req.user, userLinks });
    } catch (error) {
      console.error('Error fetching user links from MongoDB:', error);
      res.redirect('/panel/ekle?error=db');
    }
  } else {
    res.redirect('/login');
  }
});

app.use(express.urlencoded({ extended: true }));
const cron = require('node-cron');
const axios = require('axios');

app.post('/panel/ekle', async (req, res) => {
  if (req.isAuthenticated()) {
    const { name, url } = req.body;

    const isPremium = req.user.premium || false;
    const maxLinkLimit = isPremium ? 10 : 3;

    const userLinkCount = await PanelData.countDocuments({ userId: req.user.id });
    if (userLinkCount >= maxLinkLimit) {
      return res.redirect('/panel/ekle?error=limit');
    }

    const newData = new PanelData({
      name,
      url,
      userId: req.user.id,
    });

    newData.save()
      .then(async () => {
        // Log to webhook
        const webhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1202930574982127616/Hiu2c0p412PR6P1rIIO4e8bCsFbqodVd_IahMME2gXXB0hzxnaTEHMmjNjXR78UPYWDt" });
        const embed = new MessageEmbed()
          .setColor('#8BDFA9')
          .setDescription(`**<:uptime:1202930398183559218> ${req.user.username} Adlı Kullanıcı Sisteme Link Ekledi: ${name}**`);

        webhook.send({ embeds: [embed] });

        const userLinks = await PanelData.find({ userId: req.user.id });

        res.render('pages/panel', { user: req.user, userLinks });
      })
      .catch((error) => {
        console.error('Error saving data to MongoDB:', error);
        res.redirect(`/panel/ekle?error=${error.message}`);
      });
  } else {
    res.redirect('/login');
  }
});

// Schedule pinging every 30 seconds
cron.schedule('*/30 * * * * *', async () => {
  try {
    const allLinks = await PanelData.find();

    for (const link of allLinks) {
      // Send a ping to the URL using axios or any other HTTP request library
      await axios.get(link.url);
    }

    console.log('Pinged all URLs successfully');
  } catch (error) {
    console.error('Error pinging URLs:', error);
  }
});


app.post('/panel/delete', async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const linkId = req.body.linkId;

      // Fetch the name of the link before deleting
      const deletedLink = await PanelData.findOne({ _id: linkId, userId: req.user.id });
      const deletedLinkName = deletedLink.name;

      const webhook = new WebhookClient({ url: "https://discord.com/api/webhooks/1202930574982127616/Hiu2c0p412PR6P1rIIO4e8bCsFbqodVd_IahMME2gXXB0hzxnaTEHMmjNjXR78UPYWDt" });
      const embed = new MessageEmbed()
        .setColor('#E54343')
        .setDescription(`**<:f_delete:1202931247538503752>  ${req.user.username} Adlı Kullanıcı Sistemden Link Sildi: ${deletedLinkName}**`);

      webhook.send({ embeds: [embed] });

      await PanelData.deleteOne({ _id: linkId, userId: req.user.id });

      res.redirect('/panel/ekle');
    } catch (error) {
      console.error('Error deleting link from MongoDB:', error);
      res.redirect('/panel/ekle?error=db');
    }
  } else {
    res.redirect('/login');
  }
});


app.listen(port, () => {
  console.log(`Uygulama http://localhost:${port} adresinde çalışıyor.`);
});

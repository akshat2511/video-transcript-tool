const { AssemblyAI } = require('assemblyai');
const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs');
const { auth } = require('express-openid-connect');
const path = require('path');
const { fileURLToPath } = require('url');
const { log } = require('console');
const multer=require('multer');
// const upload = multer({ dest: '/' })
// const mongoose = require('mongoose');
// Initialize environment variables
dotenv.config();
const app = express();
const mongoose = require('mongoose');
const { Schema } = mongoose;
mongoose.connect(process.env.link)
const responseSchema = new Schema({
    transcript: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const userDetailsSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    creditsLeft: {
        type: Number,
        default: 5
    },
    responses: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Response'
        }
    ]
});

// Create the Models
const Response = mongoose.model('Response', responseSchema);
const UserDetails = mongoose.model('UserDetails', userDetailsSchema);

// module.exports = { UserDetails, Response };


// Set up view engine and paths
app.set('view engine', 'ejs');
 // Use path.dirname to get the directory name in CommonJS
app.set("views", path.join(__dirname, "/views"));
app.use(express.static(__dirname));

const client = new AssemblyAI({
    apiKey: process.env.assembly
});

// let transcript = await client.transcripts.transcribe({
//     audio: "./videoplayback1.mp4", language_code:"hi"
// });
// const params = {
//     audio: audioUrl,
//     language_code: 'hi'
// };

const config = {
  authRequired: false,
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',
  baseURL: process.env.base,
  clientID: process.env.clientid,
  issuerBaseURL: process.env.dev
};

// auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// req.isAuthenticated is provided from the auth router
app.get('/', async(req, res) => {
//   res.sendFile(path.join(__dirname, (req.oidc.isAuthenticated() ? 'Logged in' : 'land.html')));
// res.render((req.oidc.isAuthenticated() ? 'logedin' : 'land'))
let verified=req.oidc.isAuthenticated() ;
if (!verified) {
    res.render("land.ejs");
  }
else {
    let data =await  req.oidc.user;
    await console.log(req.oidc.user);
    
    let userdata = await UserDetails.find({ email: data.email });
    if (userdata.length == 0) 
      {const u=new UserDetails({email: data.email})
     await u.save();}
     
    //   let userInfo = req.oidc.user;
      let photo = data.picture;
    //   let userData = await UserDetails.find({ email: userInfo.email});
    //   let userCounter = userData[0].counter + 1;
    //   await user.findOneAndUpdate({ email: data.email }, { counter: userCounter });
      res.render("logedin.ejs", { userData: data, photo: photo,tran:'Transcription will be available once the video has been processed.' });
    
  }
  
});
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Upload directory (ensure it exists or create it)
    },
    filename: (req, file, cb) => {
    //   const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    //   cb(null, 'akshat'); // Generate a unique name
    const extension = path.extname(file.originalname); // Get file extension
    cb(null, `akshat${extension}`);
    }
  });
  
  // Initialize multer with storage settings
  const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
      // Only allow video files
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed!'), false);
      }
    }
  });
  
  // Define the route to handle video upload
  app.post('/', upload.single('videoFile'), async(req, res) => {
    if (req.file) {
        let transcript = await client.transcripts.transcribe({
            audio: './uploads/akshat.mp4', 
        });
        console.log(transcript);
        let data =  req.oidc.user;
        
        res.render("logedin.ejs", { userData: data, photo: data.picture,tran:transcript.text });

        



    } else {
      res.status(400).json({ error: 'Please upload a valid video file.' });
    }
  });


// app.post('/',upload.single('videoFile'),(req, res) => {
//     res.redirect('/')


// });


const createSubtitle = (words) => {
    const formatTime = (timeInMs) => {
        const date = new Date(timeInMs);
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        const milliseconds = String(timeInMs % 1000).padStart(3, '0');
        return `${hours}:${minutes}:${seconds},${milliseconds}`;
    };

    let subtitles = '';

    words.forEach((word, index) => {
        const start = formatTime(word.start);
        const end = formatTime(word.end);
        subtitles += `${index + 1}\n${start} --> ${end}\n${word.text}\n\n`;
    });

    return subtitles;
};

const saveSubtitleToFile = (subtitles, filename) => {
    fs.writeFileSync(filename, subtitles);
    console.log(`Subtitle file saved as ${filename}`);
};

// const words = transcript.words;
// const subtitles = createSubtitle(words);
// saveSubtitleToFile(subtitles, 'subtitles.srt');

// console.log(transcript);
app.post('/:ak/:lang', async (req, res) => {
    const ak = req.params.ak;
    const lang = req.params.lang;
    let transcript = await client.transcripts.transcribe({
        audio: ak, language_code: en
    });
    const subtitles = createSubtitle(transcript.words);
    saveSubtitleToFile(subtitles, 'subtitles.srt');
    const subtitleFile = fs.readFileSync('subtitles.srt');  // Fix the file read path
    res.json(transcript);
});

app.listen(5000, () => { console.log("listening on http://localhost:5000"); });

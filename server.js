'use strict';
//
var http = require('http');
var path = require('path');
// var data = require('./data.js');
// var searchdata = require('./data2.js');

var mongoose = require('mongoose');
// mongoose.connect('mongodb://localhost/myurldatabase');
mongoose.connect(process.env.MONGODB_URI, {authMechanism: 'ScramSHA1'});


var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', console.error.bind(console, 'connection open'));

var imageSchema = mongoose.Schema({
    url: String,
    snippet: String,
    thumbnail: String,
    context: String
});
var ImageModel = mongoose.model('ImageModel', imageSchema);

var searchSchema = mongoose.Schema({
  term: String,
  date: { type: Date, default: Date.now }
});
var SearchModel = mongoose.model('SearchModel', searchSchema);

// data.forEach(function(e) { 
//   let i = new ImageModel(e);
//   i.save((err, doc) => {
//     if (err) {
//       console.log(err);
//     }
//     else {
      
//     }
//   });
// });

var express = require('express');

var app = express();
var server = http.createServer(app);

app.use(express.static(path.resolve(__dirname, 'client')));

app.get("/api/imagesearch/:search", (req, res, next) => {
  let tags = req.params.search.split(' ');
  let limit = 15;
  if (req.query.limit) limit = +req.query.limit;
  let offset = 0;
  if (req.query.offset) offset = +req.query.offset;
  
  let s = [];
  tags.forEach((e) => {
    s.push({ "snippet": new RegExp(e, "i") });
  });
  
  ImageModel.find({$or: s})
    .skip(offset)
    .limit(limit)
    .select({_id: 0, url: 1, thumbnail: 1, context: 1, snippet: 1})
    .exec((err, docs) => {
      if (err) {
        res.status(500).send("Server Error");
      }
      else {
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(docs));
        
        let s = new SearchModel({term: req.params.search, date: Date.now()});
        s.save((err, doc) => {
          if (err) {
            console.error("Error saving latest search");
          }
          else {
            console.log("Searched saved");
          }
        });
      }
    });
  
});

app.get("/api/latest", (req, res, next) => {
  let limit = 10;
  if (req.query.limit) {
    limit = +req.query.limit;
  }
  
  SearchModel.find({})
    .limit(limit) 
    .sort({date: -1})
    .exec((err, docs) => {
    
      if (err) {
        res.status(500).send("Server Error");
      }
      else {
        let obj = [];
        console.log(docs);
        docs.forEach(e => {
          obj.push({term: e.term, when: e.date});
        }); 
        
        res.header('Content-Type', 'application/json');
        res.send(JSON.stringify(obj));
      }
  });
  
});

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});
const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const middleware = require("../middleware/index");
const NodeGeocoder = require("node-geocoder");

const options = {
  provider: "google",
  httpAdapter: "https",
  apiKey: process.env.GEOCODER_API_KEY,
  formatter: null
};

const geocoder = NodeGeocoder(options);

//Index Route - show all campgrounds
router.get("/campgrounds", (req, res) => {
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), "gi");
    Campground.find(
      {
        $or: [
          { name: regex },
          { location: regex },
          { "author.username": regex }
        ]
      },
      (err, allCampgrounds) => {
        if (err) {
          console.log(err);
        } else {
          if (allCampgrounds.length < 1) {
            req.flash("error", "No campgrounds match your query...");
            return res.redirect("back");
          }
          res.render("campgrounds/index", {
            campgrounds: allCampgrounds,
            page: "campgrounds"
          });
        }
      }
    );
  } else {
    // Get all campgrounds from DB
    Campground.find({}, (err, allCampgrounds) => {
      if (err) {
        console.log(err);
      } else {
        res.render("campgrounds/index", {
          campgrounds: allCampgrounds,
          page: "campgrounds"
        });
      }
    });
  }
});

//Create Route - add new campground to DB
router.post("/campgrounds", middleware.isLoggedIn, (req, res) => {
  //get data from form and add to campgrounds
  const name = req.body.name;
  const image = req.body.image;
  const cost = req.body.cost;
  const desc = req.body.description;
  const author = {
    id: req.user._id,
    username: req.user.username
  };
  geocoder.geocode(req.body.location, (err, data) => {
    if (err || !data.length) {
      req.flash("error", "Invalid address");
      return res.redirect("back");
    }
    const lat = data[0].latitude;
    const lng = data[0].longitude;
    const location = data[0].formattedAddress;
    const newCampground = {
      name: name,
      image: image,
      cost: cost,
      description: desc,
      author: author,
      location: location,
      lat: lat,
      lng: lng
    };
    // Create a new campground and save to DB
    Campground.create(newCampground, (err, campground) => {
      if (err) {
        console.log(err);
      } else {
        //redirect back to campgrounds page
        res.redirect("/campgrounds");
      }
    });
  });
});

//New Route - show form to create new campground (has to be before SHOW)
router.get("/campgrounds/new", middleware.isLoggedIn, (req, res) => {
  res.render("campgrounds/new");
});

//Show Route - shows info about one campground
router.get("/campgrounds/:id", (req, res) => {
  //find the campground with provided ID
  Campground.findById(req.params.id)
    .populate("comments")
    .exec((err, foundCampground) => {
      if (err || !foundCampground) {
        req.flash("error", "Campground not found");
        res.redirect("/campgrounds");
      } else {
        //render show template with that campground
        res.render("campgrounds/show", { campground: foundCampground });
      }
    });
});

//Edit Route
router.get(
  "/campgrounds/:id/edit",
  middleware.checkCampgroundOwnership,
  (req, res) => {
    // is user logged in
    Campground.findById(req.params.id, (err, foundCampground) => {
      res.render("campgrounds/edit", { campground: foundCampground });
    });
  }
);

//Update Route
router.put(
  "/campgrounds/:id",
  middleware.checkCampgroundOwnership,
  (req, res) => {
    geocoder.geocode(req.body.location, (err, data) => {
      if (err || !data.length) {
        req.flash("error", "Invalid address");
        return res.redirect("back");
      }
      req.body.campground.lat = data[0].latitude;
      req.body.campground.lng = data[0].longitude;
      req.body.campground.location = data[0].formattedAddress;

      //find and update the correct campground
      Campground.findByIdAndUpdate(
        req.params.id,
        req.body.campground,
        (err, updatedCampground) => {
          if (err) {
            req.flash("error", err.message);
            res.redirect("back");
          } else {
            //redirect somewhere (show page)
            res.redirect("/campgrounds/" + updatedCampground._id);
          }
        }
      );
    });
  }
);

//Destroy Route
router.delete(
  "/campgrounds/:id",
  middleware.checkCampgroundOwnership,
  (req, res) => {
    Campground.findByIdAndRemove(req.params.id, err => {
      if (err) {
        res.redirect("/campgrounds");
      } else {
        res.redirect("/campgrounds");
      }
    });
  }
);

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;

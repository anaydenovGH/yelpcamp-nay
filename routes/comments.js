const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const middleware = require("../middleware/index.js");

//Comments New
router.get(
  "/campgrounds/:id/comments/new",
  middleware.isLoggedIn,
  (req, res) => {
    //find campground by id
    Campground.findById(req.params.id, (err, campground) => {
      if (err) {
        console.log(err);
      } else {
        res.render("comments/new", { campground: campground });
      }
    });
  }
);

//Comments Create
router.post("/campgrounds/:id/comments", middleware.isLoggedIn, (req, res) => {
  //lookup campground using ID
  Campground.findById(req.params.id, (err, campground) => {
    if (err) {
      console.log(err);
      res.redirect("/campgrounds");
    } else {
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash("error", "Something went wrong!");
          console.log(err);
        } else {
          //add username and id to comment
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          //save comment
          comment.save();
          campground.comments.push(comment);
          campground.save();
          res.redirect("/campgrounds/" + campground._id);
        }
      });
    }
  });
});

// Comments Edit
router.get(
  "/campgrounds/:id/comments/:comment_id/edit",
  middleware.checkCommentOwnership,
  (req, res) => {
    Campground.findById(req.params.id, (err, foundCampground) => {
      if (err || !foundCampground) {
        req.flash("error", "Campground not found");
        return res.redirect("/campgrounds");
      }
      Comment.findById(req.params.comment_id, (err, foundComment) => {
        if (err) {
          res.redirect("back");
        } else {
          res.render("comments/edit", {
            campground_id: req.params.id,
            comment: foundComment
          });
        }
      });
    });
  }
);

//Comments Update
router.put(
  "/campgrounds/:id/comments/:comment_id/",
  middleware.checkCommentOwnership,
  (req, res) => {
    Comment.findByIdAndUpdate(
      req.params.comment_id,
      req.body.comment,
      (err, updatedComments) => {
        if (err) {
          res.redirect("back");
        } else {
          res.redirect("/campgrounds/" + req.params.id);
        }
      }
    );
  }
);

//Comments Delete
router.delete(
  "/campgrounds/:id/comments/:comment_id",
  middleware.checkCommentOwnership,
  (req, res) => {
    Comment.findByIdAndRemove(req.params.comment_id, err => {
      if (err) {
        res.redirect("back");
      } else {
        res.redirect("/campgrounds/" + req.params.id);
      }
    });
  }
);

module.exports = router;

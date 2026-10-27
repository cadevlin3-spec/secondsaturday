/* =====================================================================
   SECOND SATURDAY — MONTHLY BULLETIN
   ---------------------------------------------------------------------
   THIS IS THE ONLY FILE YOU NEED TO EDIT EACH MONTH.

   The website automatically shows the NEXT upcoming night as the big
   featured card, and lists the ones after it as "upcoming."
   Past dates disappear on their own.

   HOW TO EDIT:
   1. Change the text inside the "quotes".
   2. Keep the date in the format  "YYYY-MM-DD"  (year-month-day).
   3. Keep every comma and curly brace exactly where they are.
   4. Save the file, then commit/push (or edit it right on GitHub.com).

   You can leave any field as an empty "" and it just won't show.
   ===================================================================== */

window.SS_BULLETIN = {

  /* Optional banner shown at the top of the "This Month" section.
     Leave as "" to hide it. */
  announcement: "No Second Saturday in December or January. November 14 in Bloomsburg is our last night of the year. See you in the new year!",

  /* The list of worship nights. Add, remove, or edit freely.
     The one with the soonest future date becomes the featured card. */
  events: [
    {
      date: "2026-07-11",          // YYYY-MM-DD
      time: "6:00 PM",
      title: "July Worship Night",
      location: "Lycoming Valley Baptist Church · 4980 Lycoming Mall Dr, Montoursville, PA 17754",
      theme: "An evening of worship, prayer, and the Word",
      details: "Doors open 30 minutes early. Bring a friend. Everyone is welcome.",
      rsvp: ""                      // optional link, e.g. "https://..."  (leave "" for none)
    },
    {
      date: "2026-08-15",
      time: "6:00 PM",
      title: "August Worship Night",
      location: "Community Mennonite Fellowship · 2985 Broadway Rd, Milton, PA 17847",
      theme: "An evening of worship, prayer, and the Word",
      details: "",
      rsvp: ""
    },
    {
      date: "2026-09-12",
      time: "6:00 PM",
      title: "September Worship Night",
      location: "Bridges Alliance Church · 102 Alliance Way, Selinsgrove, PA 17870",
      theme: "An evening of worship, prayer, and the Word",
      details: "",
      rsvp: ""
    },
    {
      date: "2026-10-10",
      time: "6:00 PM",
      title: "October Worship Night",
      location: "Christian Gospel Fellowship · 2938 State Route 42, Millville, PA 17846",
      theme: "An evening of worship, prayer, and the Word",
      details: "",
      rsvp: ""
    },
    {
      date: "2026-11-14",
      time: "6:00 PM",
      title: "November Worship Night",
      location: "Shiloh Bible Church · 123 Church St, Bloomsburg, PA 17815",
      theme: "An evening of worship, prayer, and the Word",
      details: "Our last night of the year.",
      rsvp: ""
    }
  ],

  /* Optional free-form notes / announcements shown on the bulletin board.
     Add or remove lines. Leave the list empty [] to hide the board. */
  notes: [
    "Come early and stay after to meet people from other churches.",
    "Want to host a night at your church? Get in touch.",
    "Bring a friend. Everyone is welcome."
  ]
};

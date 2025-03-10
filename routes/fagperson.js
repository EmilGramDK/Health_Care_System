const { recepter } = require("./borger");
const {
  randomNumber,
  getPatientNotes,
  getPatients,
  checkLogin,
  getPatientName,
  countFagpersonMessages,
  markMessagesAsSeenFagperson,
  getPatientrecipes,
  getPatientJournals,
  getPatientLaboratories,
  getPatientVaccinations,
  getMedicine,
} = require("./functions");

exports.index = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    var user = req.session.user;
    const alert = req.query.alert;

    const sql =
      "SELECT places.id, name, address, phone, role FROM roles LEFT JOIN places ON places.id = roles.place WHERE roles.user = ? AND roles.role != 0";

    dbConn.query(sql, [user.id], function (err, result) {
      if (err) throw err;

      if (result.length > 0) {
        getPatients(user.id, dbConn).then((patients) => {
          countFagpersonMessages(user.id, dbConn).then((messages) => {
            res.render("./fagperson/index", {
              user: req.session.user,
              workplaces: result,
              patients: patients,
              alert: alert,
              messages: messages[0].count,
            });
          });
        });
      } else {
        res.redirect("/logout");
      }
    });
  } else {
    res.redirect("/fagperson/login");
  }
};

exports.patient = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const patient = req.params.patient;
    const alert = req.query.alert;

    const sql = "SELECT id, CPR, name FROM patients WHERE id = ?";

    dbConn.query(sql, [patient], function (err, result) {
      if (err) throw err;

      if (result.length > 0) {
        getPatientNotes(patient, req.session.user.id, dbConn).then((notes) => {
          getMedicine(dbConn).then((medicine) => {
            res.render("./fagperson/patient", {
              user: req.session.user,
              patient: result[0],
              notes: notes,
              alert: alert,
              medicine: medicine,
            });
          });
        });
      } else {
        res.redirect("/fagperson");
      }
    });
  } else {
    res.redirect("/fagperson/login");
  }
};

exports.recipes = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const patient = req.params.patient;
    const alert = req.query.alert;

    const sql = "SELECT id, CPR, name FROM patients WHERE id = ?";

    dbConn.query(sql, [patient], function (err, result) {
      if (err) throw err;

      if (result.length > 0) {
        getPatientrecipes(patient, dbConn).then((recipes) => {
          res.render("./fagperson/recipes", {
            user: req.session.user,
            patient: result[0],
            recipes: recipes,
            alert: alert,
          });
        });
      } else {
        res.redirect("/fagperson");
      }
    });
  } else {
    res.redirect("/fagperson/login");
  }
};

exports.indbakke = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const sql =
      "SELECT patients.name, messages.id, messages.pro, messages.patient, messages.message, messages.date, messages.seen, messages.sentBy FROM messages LEFT JOIN patients ON patients.id = messages.patient WHERE pro = ? ORDER BY date ASC";

    dbConn.query(sql, [req.session.user.id], function (err, result) {
      if (err) throw err;

      let patients = [];
      let i = 0;

      result.forEach((message) => {
        if (message.seen == 0 && message.sentBy == req.session.user.id) {
          message.seen = 1;
        }

        if (patients.length > 0 && message.patient != patients[i].patient) {
          i++;
        }

        patients[i] = message;
      });

      patients.sort(function (b, a) {
        var keyA = new Date(a.date),
          keyB = new Date(b.date);
        // Compare the 2 dates
        if (keyA < keyB) return -1;
        if (keyA > keyB) return 1;
        return 0;
      });

      markMessagesAsSeenFagperson(req.session.user.id, dbConn);

      res.render("./fagperson/indbakke", {
        user: req.session.user,
        messages: result,
        patients,
      });
    });
  } else {
    res.redirect("/fagperson/login");
  }
};

exports.note = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const id = randomNumber();
    const { note, patient } = req.body;

    const sql =
      "INSERT INTO notes (id, pro, patient, note) VALUES (?, ?, ?, ?)";

    dbConn.query(
      sql,
      [id, req.session.user.id, patient, note],
      function (err, result) {
        if (err) throw err;

        res.redirect(
          "/fagperson/patient/" + patient + "?alert=Noten blev tilføjet"
        );
      }
    );
  } else {
    res.send("Du skal være logget ind for at tilføje en note");
  }
};

exports.deleteNote = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const { noteId, patient } = req.body;

    const sql = "DELETE FROM notes WHERE id = ?";

    dbConn.query(sql, [noteId], function (err, result) {
      if (err) throw err;

      res.redirect(
        "/fagperson/patient/" + patient + "?alert=Noten blev slettet"
      );
    });
  } else {
    res.send("Du skal være logget ind for at slette en note");
  }
};

exports.sendMessage = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const { patient, message } = req.body;

    const sql =
      "INSERT INTO messages (id, pro, patient, message, sentBy) VALUES (?, ?, ?, ?, ?)";

    dbConn.query(
      sql,
      [
        randomNumber(),
        req.session.user.id,
        patient,
        message,
        req.session.user.id,
      ],
      function (err, result) {
        if (err) throw err;

        res.redirect("/fagperson/?alert=Besked blev sendt");
      }
    );
  } else {
    res.send("Du skal være logget ind for at sende en besked");
  }
};

exports.addRecipe = function (req, res, dbConn) {
  if (checkLogin(req, true)) {
    const { medicine, patient, message } = req.body;

    const sql =
      "INSERT INTO recipes (id, patient, medicine, description) VALUES (?, ?, ?, ?)";

    dbConn.query(
      sql,
      [randomNumber(), patient, medicine, message],
      function (err, result) {
        if (err) throw err;

        res.redirect(
          "/fagperson/patient/" + patient + "?alert=Receptet blev tilføjet"
        );
      }
    );
  } else {
    res.send("Du skal være logget ind for at tilføje et recept");
  }
};

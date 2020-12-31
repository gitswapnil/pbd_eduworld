import { Accounts } from 'meteor/accounts-base';
import { Random } from 'meteor/random';
import admin from "firebase-admin"; 
import { firebaseServiceAccountKey } from 'meteor/pbd-apis';
import { CronJob } from 'cron';
import { Meteor } from 'meteor/meteor';
import Collections from 'meteor/collections';

//Script for creating roles.
export const createRoles = () => {
	console.log("Creating Roles...");
	
	Roles.createRole('webmaster', { unlessExists: true });
	Roles.createRole('admin', { unlessExists: true });
	Roles.createRole('executive', { unlessExists: true });
	Roles.createRole('party', { unlessExists: true });
	Roles.addRolesToParent('executive', 'admin');
	Roles.addRolesToParent('admin', 'webmaster');

	console.log("Roles created successfully.");
}

// Deny all client-side updates to user documents
Meteor.users.deny({
  update() { return true; }
});

const seedData = () => {
	console.log("Seeding the data...");
	if(!Meteor.users.findOne({"username": "9686059262"})){
		const userId = Random.id();
		Meteor.users.rawCollection().insertOne({
			"_id": userId, 
			"username": "9686059262", 
			"emails": [
				{"address": "ssbandiwadekar@gmail.com", "verified": true}
			], 
			"profile": {"name": "Swapnil Bandiwadekar"},
			"services": {
				"password": {"bcrypt": "$2b$10$WKdO1ovrMwPnikRsO542jexCpL/NqCjb4HgIRxl16w4RHmRoubq6e"},
			},
			"createdAt": new Date(),
		}, (err, res) => {
			if(err) {
				throw new Error("Unable to create a webmaster...");
			}
		});

		Roles.addUsersToRoles(userId, "webmaster", Roles.GLOBAL_GROUP);
	};
	console.log("Data seed complete.");
}

const initializeFirebaseServices = () => {
	admin.initializeApp({
		credential: admin.credential.cert(firebaseServiceAccountKey),
		databaseURL: "https://pbd-executives.firebaseio.com"
	});
}

const initializeEnvironmentVariables = () => {
	process.env.MAIL_URL = "smtps://no-reply@mypbd.com:mypbd1247@@mail.mypbd.com:465";
	// process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
}

const initializeCronJob = () => {
	var reminderJob = new CronJob('0 0 9 * * *', function() {
		Meteor.users.rawCollection().find({ active: true, appToken: { $exists: true } }).toArray((err, docs) => {
			const tokens = [];
			
			docs.forEach(doc => {
				tokens.push(doc.appToken);
			});

			console.log("Running the reminderJob for tokens: " + tokens);
			if(tokens.length > 0) {
				let message = {
					data: { checkForReminder: "true" },
					tokens
				};

				admin.messaging().sendMulticast(message).then((response) => {
					// let newExecArr = [...notificationData.execs];
					// console.log('Successfully sent message:', response);
					if (response.successCount > 0) {
						response.responses.forEach((resp, idx) => {
					        if (resp.success) {
					        	// newExecArr[idx].status = true
					        }
				      	});

				      	// Collections.notifications.update({ _id: notificationData._id }, { $set: { execs: newExecArr } }, { multi: false });
				    }
				}).catch((error) => {
					console.log('Error sending message:', error);
				});
			}

		});

	}, null, true, 'Asia/Kolkata');

	reminderJob.start();
}

const runMigrationScripts = () => {
	console.log("Running Migrations if any...");

	const _1_0_222 = () => {
		const dataCount = Collections.projectData.find().count();
		if(dataCount == 0) {
			Collections.projectData.insert({
				webAppMajorVersion: 1,
				webAppMinorVersion: 0,
				webAppBuildNumber: 222,
				mobileAppMajorVersion: 1,
				mobileAppMinorVersion: 0,
				mobileAppBuildNumber: 222,
				createdAt: new Date()
			});
		}
	};

	_1_0_222();

	console.log("Migration successful");
}

const startupScripts = () => {
	initializeEnvironmentVariables();
	createRoles();
	seedData();
	initializeFirebaseServices();
	initializeCronJob();
	runMigrationScripts();
}

export default startupScripts;
package com.example.pbdexecutives

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.room.Room
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.io.IOException
import java.net.URL


class MyFirebaseMessagingService : FirebaseMessagingService() {
    /**
     * Called when message is received.
     *
     * @param remoteMessage Object representing the message received from Firebase Cloud Messaging.
     */
    // [START receive_message]
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // [START_EXCLUDE]
        // There are two types of messages data messages and notification messages. Data messages are handled
        // here in onMessageReceived whether the app is in the foreground or background. Data messages are the type
        // traditionally used with GCM. Notification messages are only received here in onMessageReceived when the app
        // is in the foreground. When the app is in the background an automatically generated notification is displayed.
        // When the user taps on the notification they are returned to the app. Messages containing both notification
        // and data payloads are treated as notification messages. The Firebase console always sends notification
        // messages. For more see: https://firebase.google.com/docs/cloud-messaging/concept-options
        // [END_EXCLUDE]

        // TODO(developer): Handle FCM messages here.
        // Not getting messages here? See why this may be: https://goo.gl/39bRNJ
        Log.d("pbdLog", "From: ${remoteMessage.from}")

        // Check if message contains a data payload.
        if (remoteMessage.data.isNotEmpty()) {
            Log.d("pbdLog", "Message data payload: ${remoteMessage.data}")

            if (false) {
                // For long-running tasks (10 seconds or more) use WorkManager.
                scheduleJob()
            } else {
                // Handle message within 10 seconds
                handleNow(remoteMessage.data)
            }
        }

        // Check if message contains a notification payload.
        remoteMessage.notification?.let {
            Log.d("pbdLog", "Message Notification Body: ${it.body}")
//            sendNotification(it.body.toString())
        }

        // Also if you intend on generating your own notifications as a result of a received FCM
        // message, here is where that should be initiated. See sendNotification method below.
    }
    // [END receive_message]

    // [START on_new_token]
    /**
     * Called if InstanceID token is updated. This may occur if the security of
     * the previous token had been compromised. Note that this is called when the InstanceID token
     * is initially generated so this is where you would retrieve the token.
     */
    override fun onNewToken(token: String) {
        Log.d("pbdLog", "Refreshed token: $token")

        // If you want to send messages to this application instance or
        // manage this apps subscriptions on the server side, send the
        // Instance ID token to your app server.
        GlobalScope.launch {
            val db: AppDB = Room.databaseBuilder(this@MyFirebaseMessagingService, AppDB::class.java, "PbdDB").build()
            val apiKey: String? = db.userDetailsDao().getApiKey()
            if(apiKey != null) {
                db.userDetailsDao().updateToken(token = token)
                PbdExecutivesUtils.syncData(this@MyFirebaseMessagingService)
            }
        }
    }
    // [END on_new_token]

    /**
     * Schedule async work using WorkManager.
     */
    private fun scheduleJob() {
        // [START dispatch_job]
//        val work = OneTimeWorkRequest.Builder(MyWorker::class.java).build()
//        WorkManager.getInstance().beginWith(work).enqueue()
        // [END dispatch_job]
    }

    /**
     * Handle time allotted to BroadcastReceivers.
     */
    private fun handleNow(data: MutableMap<String, String>) {
        PbdExecutivesUtils.syncData(applicationContext)

        val checkForReminder: String? = data.get("checkForReminder")

        if(checkForReminder == null) {
            val notificationTitle: String = if (data.get("type") == "info") getString(R.string.info) else getString(R.string.warning)
            val notificationText: String = data.get("text").toString()
            val notificationImg: String? = data.get("img")
            sendNotification(notificationTitle, notificationText, notificationImg)
        } else {
            sendReminder()
        }
    }

    /**
     * Create and show a simple notification containing the received FCM message.
     *
     * @param messageBody FCM message body received.
     */
    private fun sendNotification(title: String, text: String, imageUri: String?) {
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pendingIntent = PendingIntent.getActivity(this, 0 /* Request code */, intent,
            PendingIntent.FLAG_ONE_SHOT)

        val channelId = PbdExecutivesUtils.CHANNEL_ID
        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val notificationBuilder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.pbd_notification_icon)
            .setContentTitle(title)
            .setContentText(text)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setContentIntent(pendingIntent)

        if(imageUri != null) {
            try {
                val url = URL(imageUri)
                val image = BitmapFactory.decodeStream(url.openConnection().getInputStream())

//                Log.i("pbdLog", "Bitmap: $image");
                notificationBuilder.setStyle(NotificationCompat.BigPictureStyle().bigPicture(image).bigLargeIcon(null))

            } catch (e: IOException) {
                println(e)
            }
        }

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Since android Oreo notification channel is needed.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId,
                "Channel human readable title",
                NotificationManager.IMPORTANCE_DEFAULT)
            notificationManager.createNotificationChannel(channel)
        }

        notificationManager.notify(0 /* ID of notification */, notificationBuilder.build())
    }

    private fun sendReminder() {
        GlobalScope.launch {
            val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build()
            val todaysFollowUps: List<String> = db.followUpsDao().getTodaysFollowUps().map { item ->
//                            Log.i("pbdLog", "item: $item")
                val followUpFor: String = if(item.followUpFor != null) {
                    when(item.followUpFor.toInt()) {
                        0 -> "(Sampling)"
                        1 -> "(To receive order)"
                        else -> "(To get payment)"
                    }
                } else {
                    "(Contact with the organization)"
                }
                "${item.partyName} $followUpFor"
            }

            if(todaysFollowUps.isEmpty()) {
                return@launch
            }
            var textToDisplay = ""
            todaysFollowUps.forEach {
                textToDisplay += "$it\n"
            }
            textToDisplay = textToDisplay.trimEnd()

            val intent = Intent(applicationContext, HomeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                putExtra("selectedTab", 2)
            }

            val pendingIntent: PendingIntent = PendingIntent.getActivity(applicationContext, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)

            var notificationBuilder: NotificationCompat.Builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {       //for API level 26 and above.
                NotificationCompat.Builder(applicationContext, PbdExecutivesUtils.CHANNEL_ID);
            } else {
                NotificationCompat.Builder(applicationContext);
            }

            val notification: Notification = notificationBuilder
                    .setSmallIcon(R.drawable.pbd_notification_icon)
                    .setContentTitle(getText(R.string.follow_up_reminder))
                    .setStyle(NotificationCompat.BigTextStyle().bigText(textToDisplay))
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .build()
            notification.defaults = Notification.DEFAULT_ALL

            with(NotificationManagerCompat.from(applicationContext)) {
                // notificationId is a unique int for each notification that you must define
                notify(345, notification)
            }
        }
    }
}

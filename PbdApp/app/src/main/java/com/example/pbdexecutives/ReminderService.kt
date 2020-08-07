package com.example.pbdexecutives

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import com.google.common.util.concurrent.ListenableFuture
import java.util.*

class ReminderService(appContext: Context, workerParams: WorkerParameters) : ListenableWorker(appContext, workerParams) {
    private fun reminderService(completer: CallbackToFutureAdapter.Completer<ListenableWorker.Result>) {

        ReminderManager.cancelAlarm(applicationContext);

        val calendar = Calendar.getInstance()
        calendar.add(Calendar.SECOND, 1)

        ReminderManager.setAlarm(applicationContext, calendar.timeInMillis)

        completer.set(Result.success())

//        completer.setException(Throwable(error.toString()))
        Log.i("pbdLog", "Reminder Service finished.")
    }

    override fun startWork(): ListenableFuture<Result> {
        Log.i("pbdLog", "Reminder Service started.")
        return CallbackToFutureAdapter.getFuture { completer ->
            reminderService(completer)
        }
    }

    override fun onStopped() {
        super.onStopped()

        Log.i("pbdLog", "Reminder Service is stopped.")
    }
}

object ReminderManager {
    private var pendingIntent: PendingIntent? = null

    fun setAlarm(context: Context, alarmTime: Long) {
        val alarmManager: AlarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

        val intent = Intent(context, ReminderIntentService::class.java)
        intent.action = ReminderIntentService.ACTION_RUN_REMINDER

        pendingIntent = PendingIntent.getService(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)
        alarmManager.set(AlarmManager.RTC_WAKEUP, alarmTime, pendingIntent)
    }

    fun cancelAlarm(context: Context) {
        pendingIntent?.let {
            val alarmManager: AlarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            alarmManager.cancel(it)
        }
    }
}

class ReminderIntentService: IntentService("ReminderIntentService") {
    override fun onHandleIntent(intent: Intent?) {
        intent?.apply {
            when (intent.action) {
                ACTION_RUN_REMINDER -> {
                    //Search for all the followups here and show the notification.
                    Log.i("pbdLog", "Setting up the alarm here")

                    val intent = Intent(applicationContext, HomeActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        putExtra("selectedTab", 2)
                    }

                    val pendingIntent: PendingIntent = PendingIntent.getActivity(applicationContext, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)

                    var notificationBuilder: NotificationCompat.Builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {       //for API level 26 and above.
                        NotificationCompat.Builder(applicationContext, PbdExecutivesUtils().CHANNEL_ID);
                    } else {
                        NotificationCompat.Builder(applicationContext);
                    }

                    val notification: Notification = notificationBuilder
                        .setSmallIcon(R.drawable.pbd_notification_icon)
                        .setContentTitle(getText(R.string.follow_up_reminder))
                        .setStyle(NotificationCompat.BigTextStyle().bigText("This is text line1\n" +
                                "This is text line2\n" +
                                "This is text line3"))
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
    }

    companion object {
        const val ACTION_RUN_REMINDER = "ACTION_RUN_REMINDER"
    }
}

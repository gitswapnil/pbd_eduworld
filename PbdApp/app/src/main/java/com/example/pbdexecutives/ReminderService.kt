package com.example.pbdexecutives

import android.app.AlarmManager
import android.app.IntentService
import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.concurrent.futures.CallbackToFutureAdapter
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.room.Room
import androidx.work.ListenableWorker
import androidx.work.WorkerParameters
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import net.danlew.android.joda.JodaTimeAndroid
import java.text.SimpleDateFormat
import java.util.*

class ReminderService(appContext: Context, workerParams: WorkerParameters) : ListenableWorker(appContext, workerParams) {
    private fun reminderService(completer: CallbackToFutureAdapter.Completer<ListenableWorker.Result>) {
        ReminderManager.cancelAlarm(applicationContext)

        val sdf = SimpleDateFormat("yyyy:MM:dd:HH:mm")
        val currentDateAndTime: String = sdf.format(Date())

        val date: Date = sdf.parse(currentDateAndTime)
        val calendar = Calendar.getInstance()
        calendar.time = date

        loop@for(i in 1..25) {
//            Log.i("pbdLog", "hours here ${calendar.get(Calendar.HOUR_OF_DAY)}")
            val hour = calendar.get(Calendar.HOUR_OF_DAY)

            if(hour == 10) break@loop

            calendar.add(Calendar.HOUR, 1)
        }

        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        Log.i("pbdLog", "Reminder wake up call set at ${calendar.time}, in milliseconds: ${calendar.timeInMillis}")

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
    private fun notifyUser(context: Context, notificationLines: List<String>) {
        var textToDisplay = ""
        notificationLines.forEach {
            textToDisplay += "$it\n"
        }
        textToDisplay = textToDisplay.trimEnd()

        val intent = Intent(context, HomeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("selectedTab", 2)
        }

        val pendingIntent: PendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT)

        var notificationBuilder: NotificationCompat.Builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {       //for API level 26 and above.
            NotificationCompat.Builder(context, PbdExecutivesUtils.CHANNEL_ID);
        } else {
            NotificationCompat.Builder(context);
        }

        val notification: Notification = notificationBuilder
            .setSmallIcon(R.drawable.pbd_notification_icon)
            .setContentTitle(getText(R.string.follow_up_reminder))
            .setStyle(NotificationCompat.BigTextStyle().bigText(textToDisplay))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()
        notification.defaults = Notification.DEFAULT_ALL

        with(NotificationManagerCompat.from(context)) {
            // notificationId is a unique int for each notification that you must define
            notify(345, notification)
        }
    }

    override fun onHandleIntent(intent: Intent?) {
        intent?.apply {
            when (intent.action) {
                ACTION_RUN_REMINDER -> {
                    //Search for all the followups here and show the notification.
                    Log.i("pbdLog", "Setting up the alarm here")
                    GlobalScope.launch {
                        val db = Room.databaseBuilder(this@ReminderIntentService, AppDB::class.java, "PbdDB").build()
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

                        if(todaysFollowUps.isNotEmpty()) {
                            notifyUser(applicationContext, todaysFollowUps)
                        }
                    }
                }
            }
        }
    }

    companion object {
        const val ACTION_RUN_REMINDER = "ACTION_RUN_REMINDER"
    }
}

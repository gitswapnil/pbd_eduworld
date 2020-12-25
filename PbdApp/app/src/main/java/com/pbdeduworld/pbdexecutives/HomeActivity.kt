package com.pbdeduworld.pbdexecutives

import android.Manifest
import android.app.Activity
import android.content.*
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.graphics.drawable.LayerDrawable
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Log
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.widget.Switch
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.coordinatorlayout.widget.CoordinatorLayout
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import androidx.localbroadcastmanager.content.LocalBroadcastManager
import androidx.room.Room
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.*
import com.google.android.gms.tasks.Task
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.tabs.TabLayoutMediator
import kotlinx.android.synthetic.main.activity_home.*
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.util.*
import java.util.concurrent.TimeUnit
import kotlin.collections.ArrayList

class HomeActivity : AppCompatActivity(), ActivityCompat.OnRequestPermissionsResultCallback, LifecycleOwner {
    private lateinit var locationObtainedStateReceiver: BroadcastReceiver
    private lateinit var gpsSwitchStateReceiver: BroadcastReceiver
    private lateinit var dutyTimeUpdateReceiver: BroadcastReceiver
    private lateinit var userLoginStateReceiver: BroadcastReceiver

    override fun onPrepareOptionsMenu(menu: Menu?): Boolean {
        val db = Room.databaseBuilder(this, AppDB::class.java, "PbdDB").build()
        GlobalScope.launch {
            val count: Int = db.notificationsDao().getUnseenNotifications().count()

            if(count != 0) {
                setCount(this@HomeActivity, menu, count.toString())
            }
        }

        return true
    }

    private fun setCount(context: Context, menu: Menu?, count: String?) {
        val menuItem: MenuItem? = menu?.findItem(R.id.option_notifications)
        val icon: LayerDrawable = menuItem?.icon as LayerDrawable
        val badge: CountDrawable

        // Reuse drawable if possible
        val reuse: Drawable = icon.findDrawableByLayerId(R.id.ic_group_count)
        badge = if (reuse != null && reuse is CountDrawable) {
            reuse
        } else {
            val textSize: Float = context.resources.getDimension(R.dimen.badge_count_textsize)
            val badgeColor: Int = R.color.colorAccent
            CountDrawable(context, textSize, badgeColor)
        }
        badge.setCount(count!!)
        icon.mutate()
        icon.setDrawableByLayerId(R.id.ic_group_count, badge)
    }

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
//        Log.i("pbdLog", "onCreateOptionsMenu called.")
        val inflater: MenuInflater = menuInflater
        inflater.inflate(R.menu.main_menu, menu)

        return true
    }

    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {
        R.id.option_notifications -> {
            startActivity(Intent(this, NotificationsActivity::class.java))
            true
        }

        R.id.option_search -> {
            val intent = Intent(this, SearchActivity::class.java)

            if (MyTasksFragment.selected) {
                intent.putExtra("selectedTab", 0)
            } else if (ReceiptsListSwipeToRefreshContainer.selected) {
                intent.putExtra("selectedTab", 1)
            } else if (FollowUpsFragment.selected) {
                intent.putExtra("selectedTab", 2)
            }

            startActivity(intent)
            true
        }

        R.id.option_profile -> {
            startActivity(Intent(this, ProfileActivity::class.java))
            true
        }

        R.id.option_about -> {
            val alertDialog: AlertDialog? = this.let {
                val builder = AlertDialog.Builder(it)
                builder.apply {
                    setNegativeButton(R.string.cancel,
                        DialogInterface.OnClickListener { dialog, id ->
                            // User cancelled the dialog

                        })
                }
                // Set other dialog properties
                builder?.setMessage("PBD Eduworld PVT LTD. \nCTS 5448, Mahatma Phule Road, Shahapur Belgaum, 590003.\nThis app is developed by,\n Swapnil Bandiwadekar(9686059262)")
                    .setTitle(R.string.about_us)

                // Create the AlertDialog
                builder.create()
            }
            alertDialog?.show();        //show user the reason for the need of location access.
            true
        }

        else -> {
            // If we got here, the user's action was not recognized.
            // Invoke the superclass to handle it.
            super.onOptionsItemSelected(item)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            PbdExecutivesUtils.REQUEST_CHECK_LOCATION_SETTINGS ->
                when (resultCode) {
                    Activity.RESULT_OK -> {
                        Log.i("pbdLog", "Settings are changed successfully.")
//                        findViewById<TextView>(R.id.textView2).text = ""
                        PbdExecutivesUtils.startTrackingService(applicationContext);
                    }
                    Activity.RESULT_CANCELED -> {
                        Log.i("pbdLog", "Settings are not changed. Hence cannot assign on duty.")
                        Snackbar.make(
                            findViewById<CoordinatorLayout>(R.id.home_layout),
                            R.string.location_not_enabled,
                            Snackbar.LENGTH_SHORT
                        ).show()
                    }
                    else -> "Nothing"
                }
            else -> "Nothing"
        }
    }

    private fun checkSettings() {
        val locationRequest = LocationRequest.create()?.apply {
            interval = 10000
            fastestInterval = 5000
            priority = LocationRequest.PRIORITY_BALANCED_POWER_ACCURACY
        }

        val builder = locationRequest?.let { LocationSettingsRequest.Builder().addLocationRequest(it) };
        val client: SettingsClient = LocationServices.getSettingsClient(this)
        val task: Task<LocationSettingsResponse> = client.checkLocationSettings(builder?.build())

        task.addOnSuccessListener { locationSettingsResponse ->
            // All location settings are satisfied. The client can initialize
            // location requests here.
            PbdExecutivesUtils.startTrackingService(applicationContext);
        }

        task.addOnFailureListener { exception ->
            if (exception is ResolvableApiException){
                // Location settings are not satisfied, but this can be fixed
                // by showing the user a dialog.
                try {
                    // Show the dialog by calling startResolutionForResult(),
                    // and check the result in onActivityResult().
                    exception.startResolutionForResult(
                        this,
                        PbdExecutivesUtils.REQUEST_CHECK_LOCATION_SETTINGS
                    )
                } catch (sendEx: IntentSender.SendIntentException) {
                    // Ignore the error.
                }
            }
        }

    }

    override fun onRequestPermissionsResult(        //On getting the request permission's result from the user
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        if (requestCode == PbdExecutivesUtils.PERMISSION_REQUEST_FINE_ACCESS) {
            // Request for camera permission.
            if (grantResults.size == 1 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission has been granted. Start camera preview Activity.
                Log.i("pbdLog", "Permission is granted, you can start tracking services now.");
                checkSettings();
            } else {
                // Permission request was denied.
                Log.i(
                    "pbdLog",
                    "Location Permission is denied. To reactivate go to settings and change the location permission."
                );
                val snackBar = Snackbar.make(
                    findViewById<CoordinatorLayout>(R.id.home_layout),
                    R.string.location_permission_denied,
                    Snackbar.LENGTH_INDEFINITE
                )
                snackBar.setAction(R.string.settings){
                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                        data = Uri.fromParts("package", packageName, null)
                    })
                }
                snackBar.show()
            }
        }
    }

    private fun checkLocationPermissionAndSettings(): Boolean {
        Log.i("pbdLog", "Checking Location Permission.");
        if(ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            //if location access was previously granted.
            checkSettings();
        } else {
            //if location access is not yet granted.
            if(ActivityCompat.shouldShowRequestPermissionRationale(
                    this,
                    Manifest.permission.ACCESS_FINE_LOCATION
                )) {
                //if location access is not yet granted and you need to show the reason as to why it is important.
                val alertDialog: AlertDialog? = this.let {
                    val builder = AlertDialog.Builder(it)
                    builder.apply {
                        setPositiveButton(R.string.ok,
                            DialogInterface.OnClickListener { dialog, id ->
                                // User clicked OK button
                                ActivityCompat.requestPermissions(
                                    it,
                                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                                    PbdExecutivesUtils.PERMISSION_REQUEST_FINE_ACCESS
                                );
                            })
                        setNegativeButton(R.string.cancel,
                            DialogInterface.OnClickListener { dialog, id ->
                                // User cancelled the dialog
                                Log.i(
                                    "pbdLog",
                                    "Location Permission is denied. To reactivate go to settings and change the location permission."
                                );
                                val snackBar = Snackbar.make(
                                    findViewById<CoordinatorLayout>(R.id.home_layout),
                                    R.string.location_permission_denied,
                                    Snackbar.LENGTH_INDEFINITE
                                )
                                snackBar.setAction(R.string.settings) {
                                    startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                                        data = Uri.fromParts("package", packageName, null)
                                    })
                                }
                                snackBar.show()
                            })
                    }
                    // Set other dialog properties
                    builder?.setMessage(R.string.location_permission_message)
                        .setTitle(R.string.attention)

                    // Create the AlertDialog
                    builder.create()
                }
                alertDialog?.show();        //show user the reason for the need of location access.
            } else {
                //if requesting for the very first time.
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.ACCESS_FINE_LOCATION),
                    PbdExecutivesUtils.PERMISSION_REQUEST_FINE_ACCESS
                )
            }
        }
        return true;
    }

    fun changeDuty(view: View) {
        val duty: Boolean = findViewById<Switch>(R.id.duty_switch).isChecked;
        dutySwitch(false);      //reset the duty switch first;
        if(duty) {          //if the duty is ON
//            findViewById<TextView>(R.id.textView2).text = "";
            checkLocationPermissionAndSettings();      //check for the permissions.
        } else {            //if the duty is OFF
            PbdExecutivesUtils.stopTrackingService(applicationContext);
        }
    }

    private fun dutySwitch(input: Boolean) {
        findViewById<Switch>(R.id.duty_switch).isChecked = input;
    }

    private fun calculateDutyTime() {
        val calendarInstance: Calendar = Calendar.getInstance();
        val hours: Int = calendarInstance.get(Calendar.HOUR_OF_DAY);
        val minutes: Int = calendarInstance.get(Calendar.MINUTE);
        val seconds: Int = calendarInstance.get(Calendar.SECOND);
        val milliseconds: Int = calendarInstance.get(Calendar.MILLISECOND);
        val todaysCurrentMilliSeconds = (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
        val startOfToday:Long = calendarInstance.timeInMillis - todaysCurrentMilliSeconds;
        val endOfToday:Long = startOfToday + 86399999;

//        Log.i("pbdLog", "currTS: $calendarInstance.timeInMillis");
//        Log.i("pbdLog", "todaysMilliSeconds: $todaysCurrentMilliSeconds");
//        Log.i("pbdLog", "startOfToday: $startOfToday");
//        Log.i("pbdLog", "startOfToday: $endOfToday");

        this.lifecycleScope.launch {
            val db = Room.databaseBuilder(this@HomeActivity, AppDB::class.java, "PbdDB").build()
            val result = db.locationsDao().getTodaysTimestamps(
                start = startOfToday,
                end = endOfToday
            )     //result contains timestamp strings.
            var todaysMilliseconds: Long = 0
            result.forEach { tsString ->        //split those strings into arrays.
                val timestamps = tsString.split(",")
                var previousTS = timestamps[0].toLong()
                timestamps.forEach {
                    val currentTS = it.toLong()
                    todaysMilliseconds += previousTS - currentTS       //add the difference everytime.
                    previousTS = currentTS
                }
            }
//            Log.i("pbdLog", "todaysMilliseconds: $todaysMilliseconds");
            val todaysHours = TimeUnit.MILLISECONDS.toHours(todaysMilliseconds)
            val todaysMinutes = TimeUnit.MILLISECONDS.toMinutes(todaysMilliseconds) - (todaysHours * 60)
            Log.i("pbdLog", "todaysHours: ${todaysHours}, todaysMinutes: ${todaysMinutes}")
            changeDutyTime(hrs = todaysHours, min = todaysMinutes)
        }
    }

    private fun changeDutyTime(hrs: Long, min: Long) {
        findViewById<TextView>(R.id.duty_period).text = "${hrs.toString()} ${getString(R.string.hrs)} ${min.toString()} ${getString(
            R.string.mins
        )}"
    }

    private fun setTabConfigurations(selectedTab: Int) {
        val tabsAdapter = TabsAdapter(this, 3)
        tabs_pager.adapter = tabsAdapter

        var tabsText: ArrayList<String> = ArrayList()
        for (i in 0 until tabs_layout.tabCount) {
            tabsText.add(tabs_layout.getTabAt(i)?.text as String)
        }

        TabLayoutMediator(tabs_layout, tabs_pager) { tab, position ->
//            Log.i("pbdLog", "${tabsText[position]}")
            tab.text = tabsText[position]
        }.attach()

        tabs_layout.getTabAt(selectedTab)?.select()
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val selectedTab = intent.getIntExtra("selectedTab", 0)
        Log.i("pbdLog", "selectedTab: $selectedTab")

        setContentView(R.layout.activity_home)
        setSupportActionBar(findViewById(R.id.home_toolbar))
        setTabConfigurations(selectedTab)
    }

    private fun locationObjectMonitor() {
        val filter = IntentFilter(TrackingService.actionLocationObtainedBroadcast)
        val builder = AlertDialog.Builder(this)
        // Set the dialog title
        builder.setView(this.layoutInflater.inflate(R.layout.getting_location_object, null))
            // Add action buttons
            .setNegativeButton(R.string.cancel, DialogInterface.OnClickListener { dialog, id ->
                PbdExecutivesUtils.stopTrackingService(applicationContext)
            })
            .setCancelable(false)

        val bldr = builder.create()
        bldr.setCanceledOnTouchOutside(false)
//        bldr.setOnDismissListener(DialogInterface.OnDismissListener() {
//
//        });

        Log.i("pbdLog", "TrackingService.obtainingLocation: ${TrackingService.obtainingLocation}")
        if(TrackingService.obtainingLocation) {
            bldr.show()
        }

        locationObtainedStateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                val state = intent.getBooleanExtra(TrackingService.locationInfo, false)

                if(state) {
                    bldr.show()
                } else {
                    bldr.cancel()
                }
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(
            locationObtainedStateReceiver,
            filter
        )
    }

    //This function monitors the state of the switch. It listens to the broadcast from the service
    private fun gpsSwitchMonitor() {
        val filter = IntentFilter(TrackingService.actionSwitchStateBroadcast)

        gpsSwitchStateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                val switchState = intent.getBooleanExtra(TrackingService.switchInfo, false)
                dutySwitch(switchState)
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(gpsSwitchStateReceiver, filter)
    }

    private fun dutyTimeMonitor() {
        val filter = IntentFilter(TrackingService.actionTimeUpdateBroadcast)

        dutyTimeUpdateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                calculateDutyTime()
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(dutyTimeUpdateReceiver, filter)
    }

    private fun userLoginStatusMonitor() {
        val filter = IntentFilter(PbdExecutivesUtils.actionUserLoggedOut)
        val newIntent = Intent(this, MainActivity::class.java)        //go to home activity after save

        userLoginStateReceiver = object : BroadcastReceiver() {         //receiver always called only when the duty switch is OFF.
            override fun onReceive(context: Context, intent: Intent) {
                startActivity(newIntent)
                finishAffinity()
            }
        }

        LocalBroadcastManager.getInstance(this).registerReceiver(userLoginStateReceiver, filter)
    }

    private fun locationObjectUnmonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(locationObtainedStateReceiver)
    }

    private fun gpsSwitchUnmonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(gpsSwitchStateReceiver)
    }

    private fun dutyTimeUnmonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(dutyTimeUpdateReceiver)
    }

    private fun userLoginStatusUnonitor() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(userLoginStateReceiver)
    }

    override fun onResume() {
        super.onResume()
        this.invalidateOptionsMenu()        //invalidate the menu so that it validate the notifications count again
        dutySwitch(
            PbdExecutivesUtils.isMyServiceRunning(
                applicationContext,
                TrackingService::class.java
            )
        ); //check if the service is running or not.
        locationObjectMonitor()
        gpsSwitchMonitor()         //Keep monitoring the switch state.
        calculateDutyTime()
        dutyTimeMonitor()
        userLoginStatusMonitor()
    }

    override fun onPause() {
        super.onPause();

        locationObjectUnmonitor()
        gpsSwitchUnmonitor()       //Leave the resources.
        dutyTimeUnmonitor()
        userLoginStatusUnonitor()
    }

    override fun onDestroy() {
        super.onDestroy();
    }
}

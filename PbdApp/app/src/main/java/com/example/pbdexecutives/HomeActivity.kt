package com.example.pbdexecutives

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.content.*
import android.content.pm.PackageManager
import android.location.GnssStatus
import android.location.LocationManager
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.widget.Switch
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.location.LocationManagerCompat
import androidx.room.Room
import com.google.android.gms.common.api.ResolvableApiException
import com.google.android.gms.location.*
import com.google.android.gms.tasks.Task
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch


class HomeActivity : AppCompatActivity(), ActivityCompat.OnRequestPermissionsResultCallback {
    lateinit var gpsSwitchStateReceiver: BroadcastReceiver;

    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        Log.i("pbdLog", "onCreateOptionsMenu called.")
        val inflater: MenuInflater = menuInflater;
        inflater.inflate(R.menu.main_menu, menu)
        return true
    }

    protected override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            PbdExecutives().REQUEST_CHECK_LOCATION_SETTINGS ->
                when(resultCode) {
                    Activity.RESULT_OK -> {
                        Log.i("pbdLog", "Settings are changed successfully.");
                        findViewById<TextView>(R.id.textView2).text = "";
                        startTrackingService();
                    }
                    Activity.RESULT_CANCELED -> {
                        Log.i("pbdLog", "Settings are not changed. Hence cannot assign on duty.");
                        findViewById<TextView>(R.id.textView2).setText(R.string.location_not_enabled);
                    }
                    else -> "Nothing"
                }
            else -> "Nothing"
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        setSupportActionBar(findViewById(R.id.main_toolbar));
        gpsSwitchHandlerAttach();
    }

    private fun gpsSwitchHandlerAttach() {
        val filter = IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION)
        filter.addAction(Intent.ACTION_PROVIDER_CHANGED)

        gpsSwitchStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                if (LocationManager.PROVIDERS_CHANGED_ACTION == intent.action) {
                    val locationManager: LocationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
                    val isGpsEnabled: Boolean = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    val isNetworkEnabled: Boolean = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)
                    if (isGpsEnabled || isNetworkEnabled) {
                        // Handle Location turned ON
                        findViewById<TextView>(R.id.textView2).text = "";
                    } else {
                        // Handle Location turned OFF
                        Log.i("pbdLog", "GPS is turned off. changing the button state to OFF.");
                        dutySwitch(false); //check if the service is running or not.
                    }
                }
            }
        }

        this.registerReceiver(gpsSwitchStateReceiver, filter);
    }

    override fun onResume() {
        super.onResume();

        dutySwitch(isMyServiceRunning(TrackingService::class.java)); //check if the service is running or not.
    }

    private fun dutySwitch(input: Boolean) {
        findViewById<Switch>(R.id.duty_switch).isChecked = input;
    }

    //This method gives whether a service is running or not.
    private fun isMyServiceRunning(serviceClass: Class<*>): Boolean {
        val manager: ActivityManager = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        for (service: ActivityManager.RunningServiceInfo in manager.getRunningServices(Int.MAX_VALUE)) {
            if (serviceClass.name == service.service.className) {
                return true
            }
        }
        return false
    }

    private fun startTrackingService() {
        val serviceIntent = Intent(this, TrackingService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent);
        dutySwitch(true);
    }

    private fun stopTracking() {
        val serviceIntent = Intent(this, TrackingService::class.java)
        stopService(serviceIntent);
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
            startTrackingService();
        }

        task.addOnFailureListener { exception ->
            if (exception is ResolvableApiException){
                // Location settings are not satisfied, but this can be fixed
                // by showing the user a dialog.
                try {
                    // Show the dialog by calling startResolutionForResult(),
                    // and check the result in onActivityResult().
                    exception.startResolutionForResult(this, PbdExecutives().REQUEST_CHECK_LOCATION_SETTINGS)
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
        if (requestCode == PbdExecutives().PERMISSION_REQUEST_FINE_ACCESS) {
            // Request for camera permission.
            if (grantResults.size == 1 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission has been granted. Start camera preview Activity.
                Log.i("pbdLog", "Permission is granted, you can start tracking services now.");
                checkSettings();
            } else {
                // Permission request was denied.
                Log.i("pbdLog", "Location Permission is denied. To reactivate go to settings and change the location permission.");
                findViewById<TextView>(R.id.textView2).setText(R.string.location_permission_denied);
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
            if(ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION)) {
                //if location access is not yet granted and you need to show the reason as to why it is important.
                val alertDialog: AlertDialog? = this.let {
                    val builder = AlertDialog.Builder(it)
                    builder.apply {
                        setPositiveButton(R.string.ok,
                            DialogInterface.OnClickListener { dialog, id ->
                                // User clicked OK button
                                ActivityCompat.requestPermissions(it, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), PbdExecutives().PERMISSION_REQUEST_FINE_ACCESS);
                            })
                        setNegativeButton(R.string.cancel,
                            DialogInterface.OnClickListener { dialog, id ->
                                // User cancelled the dialog
                                Log.i("pbdLog", "Location Permission is denied. To reactivate go to settings and change the location permission.");
                                findViewById<TextView>(R.id.textView2).setText(R.string.location_permission_denied);
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
                ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.ACCESS_FINE_LOCATION), PbdExecutives().PERMISSION_REQUEST_FINE_ACCESS)
            }
        }
        return true;
    }

    fun changeDuty (view: View) {
        val duty: Boolean = findViewById<Switch>(R.id.duty_switch).isChecked;
        if(duty) {          //if the duty is ON
            dutySwitch(false);   //unless all the things are clear, dont turn ON the switch.
            findViewById<TextView>(R.id.textView2).text = "";
            checkLocationPermissionAndSettings();      //check for the permissions.
        } else {            //if the duty is OFF
            dutySwitch(false);
            stopTracking();
        }
    }

    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {
        R.id.action_settings -> {
            // User chose the "Settings" item, show the app settings UI...
            true
        }

        R.id.action_logout -> {     //when logs out, just clear the user information and jump to the login activity.
            Thread {
                if(isMyServiceRunning(TrackingService::class.java)){
                    stopTracking();     //Stop tracking service if the service is alive.
                };
                val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build();
                db.userDetailsDao().clearUserDetails();
                val intent = Intent(applicationContext, LoginActivity::class.java);        //go to home activity after save
                startActivity(intent);
                finishAffinity();       //remove the current activity from the activity stack so that back button makes it jump out of the application.
            }.start();
            true
        }

        else -> {
            // If we got here, the user's action was not recognized.
            // Invoke the superclass to handle it.
            super.onOptionsItemSelected(item)
        }
    }

    override fun onDestroy() {
        super.onDestroy();

        this.unregisterReceiver(gpsSwitchStateReceiver);
    }
}

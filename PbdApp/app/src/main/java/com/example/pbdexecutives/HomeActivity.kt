package com.example.pbdexecutives

import android.Manifest
import android.content.DialogInterface
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.view.View
import android.widget.Switch
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.room.Room



class HomeActivity : AppCompatActivity(), ActivityCompat.OnRequestPermissionsResultCallback {
    override fun onCreateOptionsMenu(menu: Menu): Boolean {
        Log.i("pbdLog", "onCreateOptionsMenu called.")
        val inflater: MenuInflater = menuInflater;
        inflater.inflate(R.menu.main_menu, menu)
        return true
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_home)

        setSupportActionBar(findViewById(R.id.main_toolbar));
    }

    private fun startTracking() {
        
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
                startTracking();
            } else {
                // Permission request was denied.
                Log.i("pbdLog", "Location Permission is denied. To reactivate go to settings and change the location permission.");
            }
        }
    }

    private fun checkLocationPermission(): Boolean {
        Log.i("pbdLog", "Checking Location Permission.");
        if(ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            //if location access was previously granted.
            startTracking();
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
            findViewById<Switch>(R.id.duty_switch).isChecked = false;   //unless all the things are clear, dont turn ON the switch.
            checkLocationPermission();      //check for the permissions.
        } else {            //if the duty is OFF

        }
    }

    override fun onOptionsItemSelected(item: MenuItem) = when (item.itemId) {
        R.id.action_settings -> {
            // User chose the "Settings" item, show the app settings UI...
            true
        }

        R.id.action_logout -> {     //when logs out, just clear the user information and jump to the login activity.
            Thread {
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

}

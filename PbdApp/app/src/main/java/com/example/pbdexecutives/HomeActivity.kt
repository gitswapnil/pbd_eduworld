package com.example.pbdexecutives

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.Menu
import android.view.MenuInflater
import android.view.MenuItem
import android.widget.TextView
import android.widget.Toolbar
import androidx.room.Room
import com.android.volley.Request
import com.android.volley.Response
import com.android.volley.toolbox.StringRequest
import com.android.volley.toolbox.Volley

class HomeActivity : AppCompatActivity() {
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

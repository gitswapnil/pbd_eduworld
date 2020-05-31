package com.example.pbdexecutives

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.os.Handler
import android.util.Log
import androidx.room.Room

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        val db = Room.databaseBuilder(applicationContext, AppDB::class.java, "PbdDB").build();
        val handler = Handler();
        Thread {
            var apiKey: String = "";
            db.userDetailsDao().getApiKey().forEach {       //search for the existing apiKey
                Log.i("pbdLog", "apiKey is: ${it}");
                apiKey = it;
            }

            handler.postDelayed({
                var intent: Intent = if(apiKey == "") {    //if the apiKey is not found in the database then go to the login page
                    Intent(this, LoginActivity::class.java);
                } else {        //else go to the home page
                    Intent(this, HomeActivity::class.java);
                }
                startActivity(intent);
            }, 1000);
        }.start();
    }
}

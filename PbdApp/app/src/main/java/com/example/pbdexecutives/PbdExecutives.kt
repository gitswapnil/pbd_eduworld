package com.example.pbdexecutives

import android.app.Application
import androidx.room.Room

class PbdExecutives: Application() {
    //global variables go here...
    val serverAddress = "http://localhost:3000/api";
    val PERMISSION_REQUEST_FINE_ACCESS = 1;
}
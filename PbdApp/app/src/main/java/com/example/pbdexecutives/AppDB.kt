package com.example.pbdexecutives

import androidx.room.Database
import androidx.room.RoomDatabase

@Database (entities = [UserDetails::class], version = 1)
abstract class AppDB: RoomDatabase() {
    abstract fun userDetailsDao(): UserDetailsDAO
}


package com.example.pbdexecutives

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.view.View
import android.widget.EditText

class LoginActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
    }

    fun login(view: View) {
//        val phoneNo = findViewById<EditText>(R.id.editText2);
//        val password = findViewById<EditText>(R.id.editText3);



        val intent = Intent(this, HomeActivity::class.java)
        startActivity(intent);
    }
}

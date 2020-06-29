package com.example.pbdexecutives

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.MenuItem
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.annotation.NonNull
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintSet
import androidx.lifecycle.lifecycleScope
import androidx.room.Room
import com.google.gson.annotations.SerializedName
import kotlinx.android.synthetic.main.activity_add_new_task.*
import kotlinx.coroutines.launch
import net.danlew.android.joda.JodaTimeAndroid
import org.joda.time.DateTimeZone
import org.joda.time.LocalDate
import java.text.SimpleDateFormat
import java.util.*
import kotlin.collections.ArrayList

data class PartiesListItem(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("address") val address: String
)

class PartiesListAdapter(context: Context, private val parties: List<PartiesListItem>): ArrayAdapter<PartiesListItem>(context, R.layout.parties_list_layout, parties) {
    var filteredParties: MutableList<PartiesListItem> = ArrayList<PartiesListItem>()

    override fun getCount(): Int {
        return filteredParties.size
    }

    @NonNull
    override fun getFilter(): Filter {
        return PartiesFilter(this, parties)
    }

    override fun getItem(position: Int): PartiesListItem? {
        return filteredParties[position]
    }

    override fun getItemId(position: Int): Long {
        return super.getItemId(position)
    }

    override fun getView(position: Int, view: View?, parent: ViewGroup): View {
        val newView = LayoutInflater.from(context).inflate(R.layout.parties_list_layout, parent, false)
        newView.findViewById<TextView>(R.id.name).text = filteredParties[position].name
        newView.findViewById<TextView>(R.id.address).text = filteredParties[position].address
        return newView
    }


    private class PartiesFilter(var partiesListAdapter: PartiesListAdapter, val originalList: List<PartiesListItem>): Filter() {
        var filteredList: MutableList<PartiesListItem> = ArrayList()

        override fun performFiltering(constraint: CharSequence?): FilterResults {
            filteredList.clear()
            val results = FilterResults()
            if (constraint == null || constraint.isEmpty()) {
                filteredList.addAll(originalList)
            } else {
                val filterPattern = constraint.toString().toLowerCase(Locale.ROOT).trim { it <= ' ' }
                for (party in originalList) {
                    if (party.name.toLowerCase(Locale.ROOT).contains(filterPattern)) {
                        filteredList.add(party)
                    }
                }
            }

            Log.i("pbdLog", "filteredList: $filteredList")
            results.values = filteredList
            results.count = filteredList.size
            return results
        }

        override fun publishResults(constraint: CharSequence?, results: FilterResults) {
            Log.i("pbdLog", "results.values: ${results.values}")
            partiesListAdapter.filteredParties.clear()
            partiesListAdapter.filteredParties.addAll(results.values as MutableList<PartiesListItem>)
            partiesListAdapter.notifyDataSetChanged()
        }

    }
}

class AddNewTaskActivity : AppCompatActivity() {
    private var taskId: Long = 0
    private var itemPosition: Int = -1
    private lateinit var parties: List<PartiesListItem>
    private lateinit var selectedPartyId: String
    private lateinit var selectedPartyName: String
    private var selectedReminderDate: Long? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_new_task)
        JodaTimeAndroid.init(this)

        taskId = intent.getLongExtra("taskId", 0)
        itemPosition = intent.getIntExtra("position", -1)

        setSupportActionBar(findViewById(R.id.add_new_task_toolbar))
        supportActionBar?.setDisplayHomeAsUpEnabled(true)

        val reasonForVisit: Spinner = findViewById(R.id.reason_for_visit)
        reasonForVisit.onItemSelectedListener = ReasonSpinner()

        val taskTypes: Spinner = findViewById(R.id.task_type)
        taskTypes.onItemSelectedListener = TaskTypeSpinner()

        loadParties()
        loadDoneWithTaskEvents()
        loadSetReminderEvents()

        if(taskId != 0.toLong()) {
            add_new_task_toolbar.title = getString(R.string.edit_task)
            showCurrentData()
        }
    }

    private fun showCurrentData() {
        val db = Room.databaseBuilder(this, AppDB::class.java, "PbdDB").build()
        lifecycleScope.launch {
            val taskDetails: TasksWithJoins = db.tasksDao().getTaskDetails(taskId)
            task_type.setSelection(taskDetails.type.toInt())

            if(taskDetails.type == 0.toShort()) {
                select_party.setText("${taskDetails.partyName} ${taskDetails.partyAddress}")
                selectedPartyId = taskDetails.partyId.toString()
                selectedPartyName = taskDetails.partyName.toString()
                contact_person_name.setText(taskDetails.contactPersonName)
                contact_person_number.setText(taskDetails.contactPersonNumber.toString())
                reason_for_visit.setSelection(taskDetails.reasonForVisit.toInt())
                if(taskDetails.doneWithTask)
                    task_done_yes.isChecked = true
                else
                    task_done_no.isChecked = true
                if(taskDetails.reminder)
                    reminder_yes.isChecked = true
                else
                    reminder_no.isChecked = true
                taskDetails.reminderDate?.let { reminder_calendar.date = it }
            } else {
                subject.setText(taskDetails.subject)
            }

            remarks.setText(taskDetails.remarks)

            //after setting all the fields, disable them if the current date is greater than yesterday's last date.
            val isTaskYesterday = (taskDetails.createdAt - LocalDate.now(DateTimeZone.forID("Asia/Kolkata")).toDateTimeAtStartOfDay().millis) < 0
            if(isTaskYesterday) {
                task_type.isEnabled = false
                select_party.isEnabled = false
                subject.isEnabled = false
                contact_person_name.isEnabled = false
                contact_person_number.isEnabled = false
                reason_for_visit.isEnabled = false
                task_done_no.isEnabled = false
                task_done_yes.isEnabled = false
                reminder_no.isEnabled = false
                reminder_yes.isEnabled = false
                reminder_calendar.isEnabled = false
                remarks.isEnabled = false
                save_button.isEnabled = false
            }
        }
    }

    override fun onOptionsItemSelected(item: MenuItem): Boolean {
        if (item.itemId == android.R.id.home) {
            finish();
            return true;
        }

        return super.onOptionsItemSelected(item);
    }
    
    inner class TaskTypeSpinner : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>, view: View, pos: Int, id: Long) {
            when(parent.getItemAtPosition(pos)) {
                resources.getStringArray(R.array.task_types)[0] -> {
                    changeVisitView(View.VISIBLE)
                    changeOtherView(View.GONE)
                }

                resources.getStringArray(R.array.task_types)[1] -> {
                    changeOtherView(View.VISIBLE)
                    changeVisitView(View.GONE)
                }
            }

        }

        override fun onNothingSelected(parent: AdapterView<*>) {
            // Another interface callback
        }
    }

    private fun loadParties() {
        lifecycleScope.launch {
//            var partiesListLayoutView = this@AddNewTaskActivity.layoutInflater.inflate(R.layout.parties_list_layout, scrollView3, false)
            val db = Room.databaseBuilder(this@AddNewTaskActivity, AppDB::class.java, "PbdDB").build()
            parties = db.partiesDao().getAllParties().map { party ->
                return@map PartiesListItem(party.id, party.name, party.address)
            }

//            val partiesAdapter: ArrayAdapter<String> = ArrayAdapter<String>(this@AddNewTaskActivity, android.R.layout.simple_spinner_dropdown_item, parties)
            select_party.threshold = 1
            select_party.setAdapter(PartiesListAdapter(this@AddNewTaskActivity, parties))
            select_party.onItemClickListener = AdapterView.OnItemClickListener { parent, view, position, id ->
//                Log.i("pbdLog", "clicked Item, ${parent.getItemAtPosition(position)}")
                val ListItem = (parent.getItemAtPosition(position) as PartiesListItem)
                select_party.error = null
                selectedPartyId = ListItem.id
                selectedPartyName = ListItem.name
                select_party.setText("${ListItem.name} ${ListItem.address}")
            }
        }

    }

    inner class ReasonSpinner : AdapterView.OnItemSelectedListener {
        override fun onItemSelected(parent: AdapterView<*>, view: View, pos: Int, id: Long) {
            reason_question_label.text = resources.getStringArray(R.array.task_done_questions)[pos]
            checkDoneWithTaskEvents()
        }

        override fun onNothingSelected(parent: AdapterView<*>) {
            // Another interface callback
        }
    }

    private fun loadDoneWithTaskEvents() {
        done_with_task.setOnCheckedChangeListener { group, checkedId ->
            checkDoneWithTaskEvents()
        }
    }

    private fun checkDoneWithTaskEvents() {
        val checkedId = done_with_task.checkedRadioButtonId
        val reasonForVisit = findViewById<Spinner>(R.id.reason_for_visit).selectedItemPosition
        val reminderLabels = resources.getStringArray(R.array.set_reminder_labels)

        findViewById<TextView>(R.id.reminder_label).visibility = View.VISIBLE
        findViewById<RadioGroup>(R.id.set_reminder).visibility = View.VISIBLE

        if(set_reminder.checkedRadioButtonId == R.id.reminder_no) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
        } else if(set_reminder.checkedRadioButtonId == R.id.reminder_yes) {
            findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.VISIBLE
        }

        if(checkedId == R.id.task_done_no) {
            when(reasonForVisit) {
                0 -> reminder_label.text = reminderLabels[0]
                1 -> reminder_label.text = reminderLabels[2]
                2 -> reminder_label.text = reminderLabels[4]
            }
        } else if(checkedId == R.id.task_done_yes) {
            when(reasonForVisit) {
                0 -> reminder_label.text = reminderLabels[1]
                1 -> reminder_label.text = reminderLabels[3]
                2 -> {
                    findViewById<CalendarView>(R.id.reminder_calendar).visibility = View.GONE
                    findViewById<TextView>(R.id.reminder_label).visibility = View.GONE
                    findViewById<RadioGroup>(R.id.set_reminder).visibility = View.GONE
                }
            }
        }
    }

    private fun loadSetReminderEvents() {
        set_reminder.setOnCheckedChangeListener { group, checkedId ->
            checkSetReminder()
        }

        val minDate = (System.currentTimeMillis() + 86399000)
        reminder_calendar.minDate = minDate
        reminder_calendar.date = minDate

        reminder_calendar.setOnDateChangeListener { view, year, month, dayOfMonth ->
            selectedReminderDate = SimpleDateFormat("dd/MM/yyyy").parse("${dayOfMonth}/${month + 1}/${year}")?.time
        }
    }

    private fun checkSetReminder() {
        val checkedId = set_reminder.checkedRadioButtonId
        if(checkedId == R.id.reminder_yes) {
            reminder_calendar.visibility = View.VISIBLE
        } else if(checkedId == R.id.reminder_no) {
            reminder_calendar.visibility = View.GONE
        }
    }

    private fun changeVisitView(visibility: Int) {
        select_party_label.visibility = visibility
        select_party.visibility = visibility
        contact_person_name_label.visibility = visibility
        contact_person_name.visibility = visibility
        contact_person_number_label.visibility = visibility
        contact_person_number.visibility = visibility
        reason_for_visit_label.visibility = visibility
        reason_for_visit.visibility = visibility
        reason_question_label.visibility = visibility
        done_with_task.visibility = visibility
        reminder_label.visibility = visibility
        set_reminder.visibility = visibility
        reminder_calendar.visibility = visibility

        if(visibility == View.VISIBLE) {
            checkDoneWithTaskEvents()
            checkSetReminder()
        }
    }

    private fun changeOtherView(visibility: Int) {
        subject_label.visibility = visibility
        subject.visibility = visibility

        val constraintSet: ConstraintSet = ConstraintSet()
        constraintSet.clone(add_new_task_layout)
        if(visibility == View.VISIBLE) {
            constraintSet.connect(R.id.remarks_label, ConstraintSet.TOP, R.id.subject, ConstraintSet.BOTTOM,16)
        } else {
            constraintSet.connect(R.id.remarks_label, ConstraintSet.TOP, R.id.reminder_calendar, ConstraintSet.BOTTOM,16)
        }
        constraintSet.applyTo(add_new_task_layout)
    }

    private fun validateFields(): Boolean {
        var retValue: Boolean = true
        if(task_type.selectedItem.toString() == "Visit") {
            if(this::selectedPartyId.isInitialized) {
                val selectedParty = parties.find{ it.id == selectedPartyId }
                val nameAndAddress = select_party.text.toString()
                if(selectedParty == null || ("${selectedParty.name} ${selectedParty.address}") != nameAndAddress) {
                    select_party.error = getString(R.string.select_only_from_list)
                    retValue = false
                }
            } else {
                select_party.error = getString(R.string.this_field_is_required)
                retValue = false
            }

            if(contact_person_name.text == null || contact_person_name.text.toString() == "") {
                contact_person_name.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        } else if(task_type.selectedItem.toString() == "Other") {
            if(subject.text == null || subject.text.toString() == "") {
                subject.error = getString(R.string.this_field_is_required)
                retValue = false
            }
        }

        return retValue
    }

    fun saveChanges(view: View) {
        //first validate the inputs and then save the data

        val valid:Boolean = validateFields()
        if(!valid) {
            return
        }

        val type: Int = task_type.selectedItemPosition
        val partyId: String? = if(type == 0) selectedPartyId else null
        val contactPersonName: String? = if(type == 0) contact_person_name.text.toString() else null
        val contactPersonNumber: Long? = if(type == 0) contact_person_number.text.toString().toLong() else null
        val reasonForVisit: Int = reason_for_visit.selectedItemPosition
        val doneWithTask: Boolean = (done_with_task.checkedRadioButtonId == R.id.task_done_yes)
        val reminder: Boolean = (set_reminder.checkedRadioButtonId == R.id.reminder_yes)
        val remarks: String = remarks.text.toString()
        val subject: String = subject.text.toString()
        val createdAt: Long = Date().time.toLong()

        lifecycleScope.launch {
            val db = Room.databaseBuilder(this@AddNewTaskActivity, AppDB::class.java, "PbdDB").build()

            if(taskId == 0.toLong()) {
                val task: Tasks = Tasks(
                    type = type.toShort(),
                    partyId = partyId,
                    contactPersonName = contactPersonName,
                    contactPersonNumber = contactPersonNumber,
                    reasonForVisit = reasonForVisit.toShort(),
                    doneWithTask = doneWithTask,
                    reminder = reminder,
                    remarks = remarks,
                    subject = subject,
                    createdAt = createdAt,
                    serverId = null,
                    synced = false
                )
                val newTaskId = db.tasksDao().addTask(task)

                if(type == 0) {
                    var followUpFor =
                        if(reasonForVisit == 0 && !doneWithTask) 0
                    else if(reasonForVisit == 0 && doneWithTask) 1
                    else if(reasonForVisit == 1 && !doneWithTask) 1
                    else if(reasonForVisit == 1 && doneWithTask) 2
                    else if(reasonForVisit == 2 && !doneWithTask) 2
                    else null

                    db.followUpsDao().addFollowUp(FollowUps(
                        reminderDate = if(reminder) selectedReminderDate else null,
                        partyId = partyId.toString(),
                        taskId = newTaskId,
                        followUpFor = followUpFor?.toShort(),
                        synced = false,
                        createdAt = Date().time,
                        serverId = null
                    ))

                }
            } else {
                db.tasksDao().updateTask(
                    id = taskId,
                    type = type.toShort(),
                    partyId = partyId,
                    contactPersonName = contactPersonName,
                    contactPersonNumber = contactPersonNumber,
                    reasonForVisit = reasonForVisit.toShort(),
                    doneWithTask = doneWithTask,
                    reminder = reminder,
                    remarks = remarks,
                    subject = subject
                )
            }

            PbdExecutivesUtils().syncData(applicationContext)

            val intent = Intent()
            intent.putExtra("taskId", taskId)

            if(taskId != 0.toLong()) {
                intent.putExtra("position", itemPosition)
                intent.putExtra("type", type)
                intent.putExtra("partyName", if(type == 0) selectedPartyName else subject)
                intent.putExtra("remarks", remarks)
                intent.putExtra("reasonForVisit", reasonForVisit)
            }

            setResult(RESULT_OK, intent)
            finish()
        }
    }
}

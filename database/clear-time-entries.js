const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearTimeEntries() {
  try {
    console.log('🔍 Checking current data...');
    
    // Check current counts
    const { data: timeEntries, error: timeError } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true });
    
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { data: teamMembers, error: teamError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true });

    if (timeError || projectError || teamError) {
      throw new Error('Error fetching data counts');
    }

    console.log(`📊 Before deletion:`);
    console.log(`   Time entries: ${timeEntries?.length || 0}`);
    console.log(`   Projects: ${projects?.length || 0}`);
    console.log(`   Team members: ${teamMembers?.length || 0}`);

    // Delete all time entries
    console.log('\n🗑️  Deleting all time entries...');
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches all)

    if (deleteError) {
      throw deleteError;
    }

    // Verify deletion
    const { data: remainingEntries, error: verifyError } = await supabase
      .from('time_entries')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      throw verifyError;
    }

    console.log(`✅ Time entries deleted successfully!`);
    console.log(`📊 After deletion:`);
    console.log(`   Time entries: ${remainingEntries?.length || 0}`);

    // Show remaining projects
    const { data: remainingProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, client_name')
      .order('client_name')
      .order('name');

    if (projectsError) {
      throw projectsError;
    }

    console.log(`\n📋 Remaining projects (${remainingProjects?.length || 0}):`);
    remainingProjects?.forEach(project => {
      console.log(`   ${project.client_name || 'No Client'} - ${project.name}`);
    });

    // Show remaining team members
    const { data: remainingMembers, error: membersError } = await supabase
      .from('team_members')
      .select('id, slack_username, full_name')
      .order('full_name');

    if (membersError) {
      throw membersError;
    }

    console.log(`\n👥 Remaining team members (${remainingMembers?.length || 0}):`);
    remainingMembers?.forEach(member => {
      console.log(`   ${member.full_name || member.slack_username} (@${member.slack_username})`);
    });

    console.log('\n🎉 Operation completed successfully!');
    console.log('📝 All time entries have been removed while preserving clients, projects, and team members.');

  } catch (error) {
    console.error('❌ Error clearing time entries:', error.message);
    process.exit(1);
  }
}

// Run the script
clearTimeEntries();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTimesheetData() {
  console.log('🧹 Cleaning up timesheet data...');
  console.log('This will:');
  console.log('- Remove ALL time entries');
  console.log('- Remove Internal projects');
  console.log('- Keep AmexGBT client and projects');
  console.log('- Keep all team members');
  console.log('');

  try {
    // Step 1: Remove all time entries
    console.log('📝 Removing all time entries...');
    const { error: timeEntriesError } = await supabase
      .from('time_entries')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using a condition that matches everything)

    if (timeEntriesError) {
      console.error('Error removing time entries:', timeEntriesError);
      return;
    }
    console.log('✅ All time entries removed');

    // Step 2: Remove internal projects
    console.log('🏢 Removing Internal projects...');
    const { data: internalProjects, error: internalProjectsError } = await supabase
      .from('projects')
      .delete()
      .eq('client_name', 'Internal')
      .select('name');

    if (internalProjectsError) {
      console.error('Error removing internal projects:', internalProjectsError);
      return;
    }

    if (internalProjects && internalProjects.length > 0) {
      console.log(`✅ Removed ${internalProjects.length} internal projects:`);
      internalProjects.forEach(project => {
        console.log(`   - ${project.name}`);
      });
    } else {
      console.log('ℹ️  No internal projects found to remove');
    }

    // Step 3: Verify remaining data
    console.log('\n📊 Verification - Remaining data:');
    
    // Check projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('client_name, name, description, hourly_rate')
      .order('client_name')
      .order('name');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    console.log('\n🏗️  Projects remaining:');
    if (projects && projects.length > 0) {
      projects.forEach(project => {
        console.log(`   ${project.client_name}: ${project.name} ($${project.hourly_rate}/hr)`);
      });
    } else {
      console.log('   No projects found');
    }

    // Check team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('full_name, slack_username, role, hourly_rate, is_active')
      .order('full_name');

    if (teamMembersError) {
      console.error('Error fetching team members:', teamMembersError);
      return;
    }

    console.log('\n👥 Team members:');
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach(member => {
        const status = member.is_active ? '✅' : '❌';
        console.log(`   ${status} ${member.full_name} (@${member.slack_username}) - ${member.role} ($${member.hourly_rate}/hr)`);
      });
    } else {
      console.log('   No team members found');
    }

    // Final counts
    const { data: timeEntriesCount } = await supabase
      .from('time_entries')
      .select('id', { count: 'exact', head: true });

    const { data: projectsCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true });

    const { data: amexgbtProjectsCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('client_name', 'AmexGBT');

    const { data: teamMembersCount } = await supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true });

    console.log('\n📈 Summary:');
    console.log(`   Time entries: ${timeEntriesCount?.length || 0}`);
    console.log(`   Total projects: ${projectsCount?.length || 0}`);
    console.log(`   AmexGBT projects: ${amexgbtProjectsCount?.length || 0}`);
    console.log(`   Team members: ${teamMembersCount?.length || 0}`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('The timesheet dashboard now shows only AmexGBT projects with no time entries.');

  } catch (error) {
    console.error('Unexpected error during cleanup:', error);
  }
}

// Run the cleanup
cleanupTimesheetData();

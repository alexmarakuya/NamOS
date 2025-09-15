const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCleanup() {
  console.log('🔍 Verifying cleanup results...\n');

  try {
    // Check time entries
    const { data: timeEntries, error: timeEntriesError } = await supabase
      .from('time_entries')
      .select('*');

    if (timeEntriesError) {
      console.error('Error fetching time entries:', timeEntriesError);
      return;
    }

    console.log(`📝 Time entries: ${timeEntries?.length || 0}`);

    // Check projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*');

    if (projectsError) {
      console.error('Error fetching projects:', projectsError);
      return;
    }

    console.log(`🏗️  Total projects: ${projects?.length || 0}`);
    
    if (projects && projects.length > 0) {
      const amexgbtProjects = projects.filter(p => p.client_name === 'AmexGBT');
      const internalProjects = projects.filter(p => p.client_name === 'Internal');
      
      console.log(`   - AmexGBT projects: ${amexgbtProjects.length}`);
      console.log(`   - Internal projects: ${internalProjects.length}`);
      
      console.log('\n📋 Project details:');
      projects.forEach(project => {
        console.log(`   ${project.client_name}: ${project.name}`);
      });
    }

    // Check team members
    const { data: teamMembers, error: teamMembersError } = await supabase
      .from('team_members')
      .select('*');

    if (teamMembersError) {
      console.error('Error fetching team members:', teamMembersError);
      return;
    }

    console.log(`\n👥 Team members: ${teamMembers?.length || 0}`);

    console.log('\n✅ Verification complete!');

  } catch (error) {
    console.error('Unexpected error during verification:', error);
  }
}

verifyCleanup();

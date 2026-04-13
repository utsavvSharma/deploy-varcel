const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function fixAdminPassword() {
  try {
    console.log('🔒 Starting admin password security fix...');
    
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    
    if (!fs.existsSync(usersPath)) {
      console.log('❌ Users file not found');
      return;
    }
    
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    
    // Hash the admin password
    const adminUser = users.find(u => u.id === 'admin');
    if (adminUser && adminUser.password === 'adminpass') {
      const hashedPassword = await bcrypt.hash('adminpass', 10);
      adminUser.password = hashedPassword;
      console.log('✅ Admin password hashed successfully');
    } else {
      console.log('ℹ️ Admin password already hashed or user not found');
    }
    
    // Write back to file
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
    console.log('✅ Users file updated');
    
    console.log('🎉 Security fix completed!');
    console.log('⚠️  IMPORTANT: Change the admin password in production!');
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
  }
}

fixAdminPassword();

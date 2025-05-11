import db from '../utils/db.js';

export default{
    findByUsername(username){
        return db('users').where('UserName', username).first();
    },

    findByUserID(userID){
        return db('users').where('UserID', userID).first();
    },

    add(entity){
        return db('users').insert(entity);
    },

    patch(id, entity){
        return db('users').where('UserID',id).update(entity);
    },

    delete(id){
        return db('users').where('UserID',id).del();
    },

    // Tìm người dùng theo email
    findByEmail(email) {
        return db('users').where('Email', email).first();
    },

    updatePasswordByEmail(email, newPassword) {
       return db('users')
       .where('Email', email) // Tìm người dùng theo email
       .update({ Password_hash: newPassword }); // Cập nhật mật khẩu mới
    },

    updatePasswordbyID(userID, newPasswordHash) {
        return db('users')
        .where('UserID', userID)
        .update('Password_hash', newPasswordHash);
    },

    //tìm độc giả
    countAllReaders(){
        return db('users').where('Permission', 0).count('* as total').first();
    },
    
    findReaders(limit, offset){
        return db('users').where('Permission', 0).orderBy('UserID', 'asc').limit(limit).offset(offset);
    },

    //tìm phóng viên
    countAllWriters(){
        return db('users').where('Permission', 1).count('* as total').first();
    },
    
    findWriters(limit, offset){
        return db('users').where('Permission', 1).orderBy('UserID', 'asc').limit(limit).offset(offset);
    },

    //tìm biên tập viên
    countAllEditors(){
        return db('users').where('Permission', 2).count('* as total').first();
    },
    
    findEditors(limit, offset){
        return db('users').where('Permission', 2).orderBy('UserID', 'asc').limit(limit).offset(offset);
    }
}
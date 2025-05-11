import db from '../utils/db.js';

export default{
    findCommentByPostID(PostID, limit, offset){
        return db('comment')
        .join('users', 'comment.UID', '=', 'users.UserID')
        .select('comment.*', 'users.Fullname as UName')
        .where('comment.PostID', PostID).orderBy('Date', 'desc').limit(limit).offset(offset);
    },

    countByPostID(PostID) {
        return db('comment').where('PostID',PostID).count('* as total').first();
    },

    add(entity) { 
        return db('comment').insert(entity);
    },

    delete(ComID){
        return db('comment').where('ComID',ComID).del();
    }
}
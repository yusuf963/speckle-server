'use strict'
const bcrypt = require( 'bcrypt' )
const crs = require( 'crypto-random-string' )
const appRoot = require( 'app-root-path' )
const knex = require( `${appRoot}/db/knex` )

const Streams = ( ) => knex( 'streams' )
const Branches = ( ) => knex( 'branches' )
const BranchCommits = ( ) => knex( 'branch_commits' )

module.exports = {

  async createBranch( { name, description, streamId, authorId } ) {
    let branch = {}
    branch.id = crs( { length: 10 } )
    branch.streamId = streamId
    branch.authorId = authorId
    branch.name = name.toLowerCase( )
    branch.description = description

    let [ id ] = await Branches( ).returning( 'id' ).insert( branch )

    // update stream updated at
    await Streams().where( { id: streamId } ).update( { updatedAt: knex.fn.now() } )

    return branch.id
  },

  async updateBranch( { id, name, description } ) {
    return await Branches( ).where( { id: id } ).update( { name: name, description: description } )
  },

  async getBranchById( { id } ) {
    return await Branches( ).where( { id: id } ).first( ).select( '*' )
  },

  async getBranchesByStreamId( { streamId, limit, cursor } ) {
    limit = limit || 25
    let query = Branches( ).select( '*' ).where( { streamId: streamId } )

    if ( cursor )
      query.andWhere( 'updatedAt', '<', cursor )

    query.orderBy( 'updatedAt', 'desc' ).limit( limit )

    let totalCount = await module.exports.getBranchesByStreamIdTotalCount( { streamId } )
    let rows = await query
    return { items: rows, cursor: rows.length > 0 ? rows[ rows.length - 1 ].updatedAt.toISOString( ) : null, totalCount }
  },

  async getBranchesByStreamIdTotalCount( { streamId } ) {
    let [ res ] = await Branches( ).count( ).where( { streamId: streamId } )
    return parseInt( res.count )
  },

  async getBranchByNameAndStreamId( { streamId, name } ) {
    let query = Branches( ).select( '*' ).where( { streamId: streamId } ).andWhere( { name: name } ).first( )
    return await query
  },

  async deleteBranchById( { id, streamId } ) {
    let branch = await module.exports.getBranchById( { id: id } )
    if ( branch.name === 'main' )
      throw new Error( 'Cannot delete the main branch.' )

    await Branches( ).where( { id: id } ).del( )
    await Streams().where( { id: streamId } ).update( { updatedAt: knex.fn.now() } )
    return true
  },
}
